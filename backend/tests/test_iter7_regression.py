"""
Iteration 7 — Backend regression + new seminar registration feature.
Covers:
  - SEO endpoints that previously 404'd (sitemap.xml, robots.txt)
  - Auth (login cookie-based / me / refresh / logout)
  - All major public content GETs
  - Capacity + validate-code
  - Register guest (summit / fair / seminar variants)
  - Admin guests with visit_type filter (incl. legacy summit, fair, seminar)
  - Admin bulk operations (bulk-resend-badge, bulk-send-reminder)
  - Badge PNG generation
"""
import os
import time
import uuid
import pytest
import requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    env_file = "/app/frontend/.env"
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_backend_url()
ADMIN_EMAIL = "admin@arsayatirim.com"
ADMIN_PASS = "As537273"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def created_guest_ids():
    """Cleanup at end."""
    ids: list[str] = []
    yield ids
    if not ids:
        return
    s = requests.Session()
    s.post(f"{BASE_URL}/api/auth/login",
           json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    s.post(f"{BASE_URL}/api/admin/guests/bulk-delete", json={"ids": ids}, timeout=30)


# ---------- SEO (was 404 before refactor) ----------
class TestSEO:
    def test_robots_txt(self):
        r = requests.get(f"{BASE_URL}/api/seo/robots.txt", timeout=20)
        assert r.status_code == 200, f"robots.txt -> {r.status_code}"
        assert "User-agent" in r.text
        assert "Sitemap:" in r.text

    def test_sitemap_xml(self):
        r = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=20)
        assert r.status_code == 200, f"sitemap.xml -> {r.status_code}"
        assert "<urlset" in r.text
        assert "<loc>" in r.text


# ---------- Auth ----------
class TestAuth:
    def test_login_bad_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_login_me_refresh_logout(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "access_token" in s.cookies

        me = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL

        ref = s.post(f"{BASE_URL}/api/auth/refresh", timeout=20)
        assert ref.status_code == 200

        lo = s.post(f"{BASE_URL}/api/auth/logout", timeout=20)
        assert lo.status_code == 200

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert r.status_code == 401


# ---------- Public Content GETs ----------
@pytest.mark.parametrize("path", [
    "/api/events",
    "/api/gallery",
    "/api/speakers",
    "/api/sponsors",
    "/api/blog",
    "/api/program",
    "/api/banners",
    "/api/family/settings",
    "/api/academy/courses",
    "/api/academy/categories",
    "/api/seminar/settings",
    "/api/register/capacity",
])
def test_public_content_endpoint_200(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=20)
    assert r.status_code == 200, f"GET {path} -> {r.status_code}: {r.text[:200]}"
    # Should return JSON (list or dict). Just parse.
    j = r.json()
    assert j is not None


def test_capacity_shape():
    r = requests.get(f"{BASE_URL}/api/register/capacity", timeout=20).json()
    assert "summit" in r and "fair" in r
    assert "registered" in r["summit"]
    assert "capacity" in r["summit"]


def test_validate_code_invalid():
    r = requests.post(f"{BASE_URL}/api/register/validate-code",
                      json={"code": "NOPE_DOES_NOT_EXIST_XYZ", "visit_type": "summit"}, timeout=20)
    assert r.status_code == 200
    assert r.json()["valid"] is False


# ---------- Registration: seminar (NEW, skips invite_code/capacity) ----------
class TestRegistrationSeminar:
    def test_register_guest_seminar_no_invite(self, created_guest_ids):
        uid = uuid.uuid4().hex[:10]
        payload = {
            "name": f"TEST Seminar {uid}",
            "email": f"test_sem_{uid}@example.com",
            "phone": "+905000000000",
            "city": "Istanbul",
            "company": "Test Co",
            "title": "Tester",
            "participant_type": "bireysel",
            "interest": "arsa",
            "expectations": "",
            "visit_type": "seminar",
            "seminar_slug": "arsa-temel",
            "seminar_title": "Arsa Yatirimi Temel Egitim",
            # No invite_code at all
        }
        r = requests.post(f"{BASE_URL}/api/register/guest", json=payload, timeout=30)
        assert r.status_code == 200, f"seminar registration failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["verified"] is True
        assert data["needs_verification"] is False
        assert data["badge_url"].startswith("/api/badge/")
        created_guest_ids.append(data["id"])

    def test_register_guest_fair_no_invite(self, created_guest_ids):
        uid = uuid.uuid4().hex[:10]
        payload = {
            "name": f"TEST Fair {uid}",
            "email": f"test_fair_{uid}@example.com",
            "phone": "+905000000001",
            "city": "Istanbul",
            "company": "Test Co",
            "title": "Tester",
            "participant_type": "bireysel",
            "interest": "fuar",
            "expectations": "",
            "visit_type": "fair",
        }
        r = requests.post(f"{BASE_URL}/api/register/guest", json=payload, timeout=30)
        assert r.status_code == 200, f"fair registration failed: {r.status_code} {r.text}"
        created_guest_ids.append(r.json()["id"])

    def test_register_guest_summit_missing_invite_fails(self):
        uid = uuid.uuid4().hex[:10]
        payload = {
            "name": f"TEST Summit {uid}",
            "email": f"test_summit_noinvite_{uid}@example.com",
            "phone": "+905000000002",
            "city": "Istanbul",
            "company": "X",
            "title": "T",
            "participant_type": "bireysel",
            "interest": "z",
            "expectations": "",
            "visit_type": "summit",
        }
        r = requests.post(f"{BASE_URL}/api/register/guest", json=payload, timeout=30)
        # Must reject due to missing invite code
        assert r.status_code == 400, f"summit without invite should fail, got {r.status_code}"


# ---------- Badge PNG ----------
class TestBadge:
    def test_badge_png(self, created_guest_ids):
        if not created_guest_ids:
            pytest.skip("No guest created")
        gid = created_guest_ids[0]
        r = requests.get(f"{BASE_URL}/api/badge/{gid}", timeout=30)
        assert r.status_code == 200, f"badge -> {r.status_code} {r.text[:200]}"
        # response could be HTML or PNG; just check non-empty + 200
        assert len(r.content) > 100


# ---------- Admin filters ----------
class TestAdminGuests:
    def _ensure_seeds(self, created_guest_ids):
        # Make sure at least one seminar + one fair record exist
        if not created_guest_ids:
            # Best-effort create both
            for vt, sem in (("seminar", True), ("fair", False)):
                uid = uuid.uuid4().hex[:8]
                payload = {
                    "name": f"TEST {vt} {uid}",
                    "email": f"test_{vt}_seed_{uid}@example.com",
                    "phone": "+90500000" + uid[:4],
                    "city": "X", "company": "Y", "title": "T",
                    "participant_type": "bireysel",
                    "interest": "", "expectations": "",
                    "visit_type": vt,
                }
                if sem:
                    payload["seminar_slug"] = "arsa-temel"
                    payload["seminar_title"] = "Arsa Egitim"
                r = requests.post(f"{BASE_URL}/api/register/guest", json=payload, timeout=30)
                if r.status_code == 200:
                    created_guest_ids.append(r.json()["id"])

    def test_filter_seminar_only(self, admin_session, created_guest_ids):
        self._ensure_seeds(created_guest_ids)
        r = admin_session.get(f"{BASE_URL}/api/admin/guests?visit_type=seminar", timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        rows = r.json()
        assert isinstance(rows, list)
        for g in rows:
            assert g.get("visit_type") == "seminar", f"non-seminar in seminar filter: {g}"

    def test_filter_fair_only(self, admin_session, created_guest_ids):
        self._ensure_seeds(created_guest_ids)
        r = admin_session.get(f"{BASE_URL}/api/admin/guests?visit_type=fair", timeout=30)
        assert r.status_code == 200
        for g in r.json():
            assert g.get("visit_type") == "fair", f"non-fair in fair filter: {g.get('visit_type')}"

    def test_filter_summit_excludes_seminar(self, admin_session, created_guest_ids):
        self._ensure_seeds(created_guest_ids)
        r = admin_session.get(f"{BASE_URL}/api/admin/guests?visit_type=summit", timeout=30)
        assert r.status_code == 200
        for g in r.json():
            vt = g.get("visit_type")
            assert vt != "seminar", f"seminar leaked into summit filter: {g}"
            assert vt != "fair", f"fair leaked into summit filter: {g}"


# ---------- Admin bulk ops ----------
class TestAdminBulk:
    def test_bulk_resend_and_reminder(self, admin_session, created_guest_ids):
        if not created_guest_ids:
            pytest.skip("no guests")
        ids = created_guest_ids[:1]
        r1 = admin_session.post(f"{BASE_URL}/api/admin/guests/bulk-resend-badge",
                                json={"ids": ids}, timeout=30)
        assert r1.status_code == 200, f"bulk-resend-badge: {r1.status_code} {r1.text}"
        r2 = admin_session.post(f"{BASE_URL}/api/admin/guests/bulk-send-reminder",
                                json={"ids": ids}, timeout=30)
        assert r2.status_code == 200, f"bulk-send-reminder: {r2.status_code} {r2.text}"


# ---------- Exhibitor + speaker app ----------
class TestExhibitorAndSpeaker:
    def test_exhibitor_register(self):
        uid = uuid.uuid4().hex[:8]
        payload = {
            "company_name": f"TEST Co {uid}",
            "contact_name": "Tester",
            "email": f"test_ex_{uid}@example.com",
            "phone": "+905001112233",
            "sector": "gayrimenkul",
            "stand_preference": "Standart",
            "message": "test",
        }
        r = requests.post(f"{BASE_URL}/api/register/exhibitor", json=payload, timeout=30)
        assert r.status_code == 200, f"exhibitor: {r.status_code} {r.text}"

    def test_speaker_application(self):
        uid = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST Speaker {uid}",
            "email": f"test_spk_{uid}@example.com",
            "phone": "+905009998877",
            "company": "TestCo",
            "expertise": "arsa",
            "topic": "arsa yatirim",
            "application_type": "konusmaci",
            "message": "test"
        }
        r = requests.post(f"{BASE_URL}/api/register/speaker-application", json=payload, timeout=30)
        assert r.status_code == 200, f"speaker: {r.status_code} {r.text}"
