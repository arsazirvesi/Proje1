"""Iteration 4: Tests for 3 registration types + admin CRM endpoints.
Covers: visitor (guest), exhibitor, speaker_application flows + admin filters.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TS = int(time.time())


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "admin@arsayatirim.com", "password": "Admin@2026!"})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def public():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Visitor (Guest) registration ----------------
class TestVisitor:
    created_id = None
    email = f"test_visitor_{TS}@example.com"

    def test_create_visitor(self, public):
        payload = {
            "name": "TEST Visitor",
            "email": self.email,
            "phone": "+905550001111",
            "city": "Istanbul",
            "company": "TestCo",
            "title": "Manager",
            "participant_type": "yatirimci",
            "interest_area": "arsa",
            "expectations": "Learn about land investment",
        }
        r = public.post(f"{BASE_URL}/api/register/guest", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and data["id"]
        assert "badge_url" in data
        TestVisitor.created_id = data["id"]

    def test_duplicate_visitor_rejected(self, public):
        r = public.post(f"{BASE_URL}/api/register/guest",
                        json={"name": "x", "email": self.email, "phone": "1"})
        assert r.status_code == 400

    def test_admin_list_guests(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/guests")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        found = [g for g in data if g.get("email") == self.email]
        assert len(found) == 1
        g = found[0]
        assert g["status"] == "new"
        assert g["admin_notes"] == ""
        assert g.get("participant_type") == "yatirimci"
        assert g.get("interest_area") == "arsa"
        assert "updated_at" in g

    def test_admin_filter_status_new(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/guests", params={"status": "new"})
        assert r.status_code == 200
        assert all(g.get("status") == "new" for g in r.json())

    def test_admin_search_q(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/guests", params={"q": self.email})
        assert r.status_code == 200
        assert any(g["email"] == self.email for g in r.json())

    def test_admin_patch_status_and_notes(self, admin):
        gid = TestVisitor.created_id
        assert gid
        r = admin.patch(f"{BASE_URL}/api/admin/guests/{gid}",
                        json={"status": "contacted", "admin_notes": "Called OK"})
        assert r.status_code == 200
        # verify persisted
        r2 = admin.get(f"{BASE_URL}/api/admin/guests", params={"q": self.email})
        updated = [g for g in r2.json() if g["id"] == gid][0]
        assert updated["status"] == "contacted"
        assert updated["admin_notes"] == "Called OK"

    def test_badge_endpoint(self, public):
        gid = TestVisitor.created_id
        r = public.get(f"{BASE_URL}/api/badge/{gid}")
        assert r.status_code == 200
        assert "TEST Visitor" in r.text

    def test_zz_delete(self, admin):
        gid = TestVisitor.created_id
        r = admin.delete(f"{BASE_URL}/api/admin/guests/{gid}")
        assert r.status_code == 200


# ---------------- Exhibitor registration ----------------
class TestExhibitor:
    created_id = None
    email = f"test_exhibitor_{TS}@example.com"

    def test_create_exhibitor(self, public):
        payload = {
            "company_name": "TEST Firma A.Ş.",
            "contact_name": "TEST Contact",
            "email": self.email,
            "phone": "+905550002222",
            "tax_office": "Kadıköy",
            "tax_number": "1234567890",
            "sector": "Gayrimenkul",
            "stand_preference": "10m2 köşe",
            "products_services": "Arsa satışı",
            "website": "https://example.com",
            "social_media": "@testfirma",
            "notes": "Test notu",
        }
        r = public.post(f"{BASE_URL}/api/register/exhibitor", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("id")
        TestExhibitor.created_id = data["id"]

    def test_duplicate_exhibitor_rejected(self, public):
        r = public.post(f"{BASE_URL}/api/register/exhibitor",
                        json={"company_name": "x", "contact_name": "x",
                              "email": self.email, "phone": "1"})
        assert r.status_code == 400

    def test_admin_list_exhibitors(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/exhibitors")
        assert r.status_code == 200
        data = r.json()
        found = [e for e in data if e["email"] == self.email]
        assert len(found) == 1
        e = found[0]
        assert e["status"] == "new"
        assert e["admin_notes"] == ""
        assert e["company_name"] == "TEST Firma A.Ş."

    def test_admin_exhibitor_search(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/exhibitors",
                      params={"q": "TEST Firma"})
        assert r.status_code == 200
        assert any(e["email"] == self.email for e in r.json())

    def test_admin_patch_exhibitor(self, admin):
        eid = TestExhibitor.created_id
        r = admin.patch(f"{BASE_URL}/api/admin/exhibitors/{eid}",
                        json={"status": "approved", "admin_notes": "Onaylandı"})
        assert r.status_code == 200
        r2 = admin.get(f"{BASE_URL}/api/admin/exhibitors", params={"q": self.email})
        upd = [e for e in r2.json() if e["id"] == eid][0]
        assert upd["status"] == "approved"
        assert upd["admin_notes"] == "Onaylandı"

    def test_zz_delete(self, admin):
        r = admin.delete(f"{BASE_URL}/api/admin/exhibitors/{TestExhibitor.created_id}")
        assert r.status_code == 200


# ---------------- Speaker Application registration ----------------
class TestSpeakerApplications:
    created_ids = {}
    email = f"test_speaker_{TS}@example.com"

    @pytest.mark.parametrize("app_type,extra", [
        ("konusmaci", {"topic": "Arsa yatırımı", "expertise": "Gayrimenkul", "bio": "Bio"}),
        ("panelist", {"expertise": "Hukuk", "bio": "Bio"}),
        ("sponsor", {"sponsor_package": "gold", "company": "SponsorCo"}),
    ])
    def test_create_speaker_apps_all_types(self, public, app_type, extra):
        payload = {
            "application_type": app_type,
            "name": f"TEST {app_type}",
            "email": self.email,
            "phone": "+905550003333",
            **extra,
        }
        r = public.post(f"{BASE_URL}/api/register/speaker-application", json=payload)
        assert r.status_code == 200, f"{app_type}: {r.text}"
        data = r.json()
        assert data.get("id")
        TestSpeakerApplications.created_ids[app_type] = data["id"]

    def test_duplicate_same_type_rejected(self, public):
        r = public.post(f"{BASE_URL}/api/register/speaker-application",
                        json={"application_type": "konusmaci", "name": "x",
                              "email": self.email, "phone": "1"})
        assert r.status_code == 400

    def test_admin_list_all(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/speaker-applications")
        assert r.status_code == 200
        mine = [a for a in r.json() if a["email"] == self.email]
        assert len(mine) == 3
        types = sorted([a["application_type"] for a in mine])
        assert types == ["konusmaci", "panelist", "sponsor"]
        for a in mine:
            assert a["status"] == "new"

    def test_filter_by_application_type(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/speaker-applications",
                      params={"application_type": "sponsor"})
        assert r.status_code == 200
        assert all(a["application_type"] == "sponsor" for a in r.json())

    def test_filter_status_and_search(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/speaker-applications",
                      params={"status": "new", "q": self.email})
        assert r.status_code == 200
        assert all(a["status"] == "new" for a in r.json())

    def test_patch_status(self, admin):
        aid = TestSpeakerApplications.created_ids["konusmaci"]
        r = admin.patch(f"{BASE_URL}/api/admin/speaker-applications/{aid}",
                        json={"status": "rejected", "admin_notes": "Uygun değil"})
        assert r.status_code == 200
        r2 = admin.get(f"{BASE_URL}/api/admin/speaker-applications",
                       params={"q": self.email})
        upd = [a for a in r2.json() if a["id"] == aid][0]
        assert upd["status"] == "rejected"
        assert upd["admin_notes"] == "Uygun değil"

    def test_zz_delete_all(self, admin):
        for aid in TestSpeakerApplications.created_ids.values():
            r = admin.delete(f"{BASE_URL}/api/admin/speaker-applications/{aid}")
            assert r.status_code == 200


# ---------------- Dashboard ----------------
def test_admin_dashboard_has_new_stats(admin):
    r = admin.get(f"{BASE_URL}/api/admin/dashboard")
    assert r.status_code == 200
    data = r.json()
    stats = data.get("stats", {})
    for key in ["members", "guests", "exhibitors", "speaker_applications",
                "blog_posts", "events"]:
        assert key in stats, f"missing {key}"
    assert "recent_exhibitors" in data
    assert "recent_speaker_applications" in data


# ---------------- Email broadcast ----------------
@pytest.mark.parametrize("rtype", ["members", "guests", "exhibitors", "speaker_applications"])
def test_email_broadcast_accepts_recipient_types(admin, rtype):
    r = admin.post(f"{BASE_URL}/api/admin/email/send",
                   json={"subject": "Test", "content": "<p>hi</p>", "recipient_type": rtype})
    assert r.status_code == 200
    data = r.json()
    assert "sendgrid_configured" in data


def test_email_broadcast_invalid_type(admin):
    r = admin.post(f"{BASE_URL}/api/admin/email/send",
                   json={"subject": "t", "content": "c", "recipient_type": "bogus"})
    assert r.status_code == 400


# ---------------- Auth unchanged ----------------
def test_auth_me_requires_cookie(public):
    r = public.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401
