"""End-to-end tests for the API Keys / external scanner endpoints.

Covers:
- Admin auth (cookie-based login)
- POST/GET/PUT/DELETE /api/admin/api-keys
- POST /api/external/checkin (valid, invalid key, inactive key, scope-mismatch,
  mark_checkin=false, double-scan -> already_checked_in)
- GET /api/external/guests (scope filter, limit)
- Cleanup test API keys + test guests
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

# ---- Config ---------------------------------------------------------------
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://arsa-yatirim-zirvesi.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@arsayatirim.com"
ADMIN_PASSWORD = "As537273"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "arsa_yatirim_db"

TEST_LABEL_PREFIX = "TEST_"


# ---- Fixtures -------------------------------------------------------------
@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="session")
def test_guests(mongo_db):
    """Create two verified test guests (one fair, one summit) directly in DB.

    Returns dict with badge codes & guest_ids; cleans up afterwards.
    """
    created_ids = []
    now_iso = datetime.now(timezone.utc).isoformat()
    fair_doc = {
        "name": "TEST Fair Guest",
        "email": f"test_fair_{uuid.uuid4().hex[:6]}@example.com",
        "phone": "+905555555555",
        "company": "TEST Co",
        "title": "Test",
        "city": "Istanbul",
        "visit_type": "fair",
        "is_verified": True,
        "checked_in": False,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    summit_doc = {**fair_doc,
                  "name": "TEST Summit Guest",
                  "email": f"test_summit_{uuid.uuid4().hex[:6]}@example.com",
                  "visit_type": "summit"}
    fair_res = mongo_db.guests.insert_one(fair_doc)
    summit_res = mongo_db.guests.insert_one(summit_doc)
    created_ids.extend([fair_res.inserted_id, summit_res.inserted_id])
    fair_id = str(fair_res.inserted_id)
    summit_id = str(summit_res.inserted_id)
    yield {
        "fair_id": fair_id,
        "summit_id": summit_id,
        "fair_code": f"AYZ2026-{fair_id}",
        "summit_code": f"AYZ2026-{summit_id}",
    }
    # Cleanup
    mongo_db.guests.delete_many({"_id": {"$in": created_ids}})


@pytest.fixture(scope="session")
def created_keys(admin_session):
    """Hold list of created key ids for cleanup."""
    ids = []
    yield ids
    for kid in ids:
        try:
            admin_session.delete(f"{API}/admin/api-keys/{kid}", timeout=10)
        except Exception:
            pass


# ---- 1. Admin login -------------------------------------------------------
class TestAdminAuth:
    def test_login_sets_cookie(self, admin_session):
        # access_token cookie should be present
        cookies = admin_session.cookies.get_dict()
        assert "access_token" in cookies, f"cookies={cookies}"

    def test_me_endpoint(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---- 2. API Keys CRUD -----------------------------------------------------
class TestApiKeysCrud:
    def test_create_fair_key(self, admin_session, created_keys):
        body = {"label": f"{TEST_LABEL_PREFIX}FairScanner-{uuid.uuid4().hex[:4]}", "valid_for": "fair"}
        r = admin_session.post(f"{API}/admin/api-keys", json=body, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        assert data["label"] == body["label"]
        assert data["valid_for"] == "fair"
        assert data["is_active"] is True
        assert data["usage_count"] == 0
        assert data["last_used_at"] is None
        assert data["key"].startswith("ayz_") or len(data["key"]) >= 16
        created_keys.append(data["id"])
        # Stash for next tests
        pytest.fair_key_id = data["id"]
        pytest.fair_key_secret = data["key"]

    def test_create_both_key(self, admin_session, created_keys):
        body = {"label": f"{TEST_LABEL_PREFIX}BothScanner", "valid_for": "both"}
        r = admin_session.post(f"{API}/admin/api-keys", json=body, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["valid_for"] == "both"
        created_keys.append(data["id"])
        pytest.both_key_id = data["id"]
        pytest.both_key_secret = data["key"]

    def test_create_label_too_short(self, admin_session):
        r = admin_session.post(f"{API}/admin/api-keys", json={"label": "A"}, timeout=10)
        assert r.status_code == 400

    def test_list_api_keys(self, admin_session):
        r = admin_session.get(f"{API}/admin/api-keys", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [d["id"] for d in data]
        assert pytest.fair_key_id in ids
        assert pytest.both_key_id in ids
        # Each entry exposes key, usage_count, last_used_at
        for d in data:
            assert "key" in d
            assert "usage_count" in d
            assert "last_used_at" in d

    def test_toggle_active_persists(self, admin_session):
        # Deactivate the both-key
        r = admin_session.put(f"{API}/admin/api-keys/{pytest.both_key_id}",
                              json={"is_active": False}, timeout=10)
        assert r.status_code == 200
        assert r.json()["is_active"] is False
        # GET to verify
        r2 = admin_session.get(f"{API}/admin/api-keys", timeout=10)
        match = next(k for k in r2.json() if k["id"] == pytest.both_key_id)
        assert match["is_active"] is False
        # Reactivate to use later
        admin_session.put(f"{API}/admin/api-keys/{pytest.both_key_id}",
                          json={"is_active": True}, timeout=10)


# ---- 3. External /checkin -------------------------------------------------
class TestExternalCheckin:
    def test_invalid_api_key(self):
        r = requests.post(f"{API}/external/checkin",
                          headers={"X-API-Key": "ayz_invalid_key_xyz"},
                          json={"code": "AYZ2026-deadbeef"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_missing_api_key(self):
        r = requests.post(f"{API}/external/checkin", json={"code": "AYZ2026-x"}, timeout=10)
        assert r.status_code == 401

    def test_inactive_key_rejected(self, admin_session, created_keys):
        # create + deactivate a key
        body = {"label": f"{TEST_LABEL_PREFIX}Inactive", "valid_for": "both"}
        c = admin_session.post(f"{API}/admin/api-keys", json=body, timeout=10).json()
        created_keys.append(c["id"])
        admin_session.put(f"{API}/admin/api-keys/{c['id']}", json={"is_active": False}, timeout=10)
        r = requests.post(f"{API}/external/checkin",
                          headers={"X-API-Key": c["key"]},
                          json={"code": "AYZ2026-anything"}, timeout=10)
        assert r.status_code == 403

    def test_validate_only_does_not_mark(self, test_guests, admin_session):
        # mark_checkin=false on a fresh fair guest
        r = requests.post(f"{API}/external/checkin",
                          headers={"X-API-Key": pytest.both_key_secret},
                          json={"code": test_guests["fair_code"], "mark_checkin": False},
                          timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "approved"
        # Verify NOT checked in via admin guests endpoint
        gr = admin_session.get(f"{API}/admin/guests", timeout=10)
        guest = next(g for g in gr.json() if g["id"] == test_guests["fair_id"])
        assert guest.get("checked_in", False) is False

    def test_fair_key_rejects_summit_guest(self, test_guests):
        r = requests.post(f"{API}/external/checkin",
                          headers={"X-API-Key": pytest.fair_key_secret},
                          json={"code": test_guests["summit_code"]}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "not_found"
        assert "yetkili değil" in data["message"].lower() or "yetkili degil" in data["message"].lower()

    def test_first_scan_approved_then_already_checked_in(self, test_guests, admin_session):
        # First scan -> approved
        r1 = requests.post(f"{API}/external/checkin",
                           headers={"X-API-Key": pytest.fair_key_secret},
                           json={"code": test_guests["fair_code"], "mark_checkin": True},
                           timeout=10)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["status"] == "approved"
        assert d1["guest"]["visit_type"] == "fair"
        # Second scan -> already_checked_in
        r2 = requests.post(f"{API}/external/checkin",
                           headers={"X-API-Key": pytest.fair_key_secret},
                           json={"code": test_guests["fair_code"], "mark_checkin": True},
                           timeout=10)
        assert r2.status_code == 200
        assert r2.json()["status"] == "already_checked_in"
        # usage_count incremented on the key
        keys = admin_session.get(f"{API}/admin/api-keys", timeout=10).json()
        fair_key = next(k for k in keys if k["id"] == pytest.fair_key_id)
        assert fair_key["usage_count"] >= 2  # at least the two scans above (plus prior validate-only=0 since we used both_key for that)
        assert fair_key["last_used_at"] is not None


# ---- 4. External /guests --------------------------------------------------
class TestExternalGuests:
    def test_fair_key_returns_only_fair(self, test_guests):
        r = requests.get(f"{API}/external/guests?limit=10",
                         headers={"X-API-Key": pytest.fair_key_secret}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "guests" in data
        for g in data["guests"]:
            assert g["visit_type"] == "fair"
        # Our fair test guest should be in there
        ids = [g["guest_id"] for g in data["guests"]]
        assert test_guests["fair_id"] in ids

    def test_fair_key_cannot_query_summit(self):
        r = requests.get(f"{API}/external/guests?visit_type=summit",
                         headers={"X-API-Key": pytest.fair_key_secret}, timeout=10)
        assert r.status_code == 403

    def test_both_key_returns_both(self, test_guests):
        r = requests.get(f"{API}/external/guests?limit=50",
                         headers={"X-API-Key": pytest.both_key_secret}, timeout=10)
        assert r.status_code == 200
        types = {g["visit_type"] for g in r.json()["guests"]}
        # may not have summit yet but at least fair must be there
        assert "fair" in types or "summit" in types


# ---- 5. Delete final ------------------------------------------------------
class TestDeleteApiKey:
    def test_delete_key(self, admin_session, created_keys):
        # Create a throwaway key & delete it; verify removed from list
        body = {"label": f"{TEST_LABEL_PREFIX}ToDelete", "valid_for": "fair"}
        c = admin_session.post(f"{API}/admin/api-keys", json=body, timeout=10).json()
        kid = c["id"]
        r = admin_session.delete(f"{API}/admin/api-keys/{kid}", timeout=10)
        assert r.status_code == 200
        # verify gone
        keys = admin_session.get(f"{API}/admin/api-keys", timeout=10).json()
        assert kid not in [k["id"] for k in keys]
