"""Backend API tests for Arsa Yatırım Zirvesi 2026"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@arsayatirim.com", "password": "Admin@2026!"})
    if resp.status_code != 200:
        pytest.skip(f"Admin login failed: {resp.status_code} {resp.text}")
    return s

# --- Public endpoints ---
def test_get_speakers(session):
    r = session.get(f"{BASE_URL}/api/speakers")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Speakers count: {len(data)}")
    # Check Muhammet Özdemir is featured
    featured = [s for s in data if s.get("is_featured")]
    print(f"Featured speakers: {[s['name'] for s in featured]}")

def test_get_program(session):
    r = session.get(f"{BASE_URL}/api/program")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Program sessions: {len(data)}")

def test_get_events(session):
    r = session.get(f"{BASE_URL}/api/events")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Past events: {len(data)}")

def test_get_blog(session):
    r = session.get(f"{BASE_URL}/api/blog")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_get_banners(session):
    r = session.get(f"{BASE_URL}/api/banners")
    assert r.status_code == 200

def test_get_sponsors(session):
    r = session.get(f"{BASE_URL}/api/sponsors")
    assert r.status_code == 200

# --- Registration ---
def test_register_member(session):
    ts = int(time.time())
    payload = {"name": "TEST_Member User", "email": f"test_member_{ts}@example.com", "phone": "5551234567", "company": "Test Co", "city": "İstanbul"}
    r = session.post(f"{BASE_URL}/api/register/member", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    pytest.member_email = payload["email"]
    print(f"Member ID: {data['id']}")

def test_register_member_duplicate(session):
    email = getattr(pytest, "member_email", "test_member_xyz123@example.com")
    payload = {"name": "TEST_Member User", "email": email}
    r = session.post(f"{BASE_URL}/api/register/member", json=payload)
    assert r.status_code == 400

def test_register_guest(session):
    ts = int(time.time())
    payload = {"name": "TEST_Guest User", "email": f"test_guest_{ts}@example.com", "company": "Test Co", "title": "CEO", "city": "Ankara", "expectations": "Networking"}
    r = session.post(f"{BASE_URL}/api/register/guest", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "badge_url" in data
    pytest.guest_id = data["id"]
    print(f"Guest ID: {data['id']}, Badge URL: {data['badge_url']}")

def test_badge_generation(session):
    if not hasattr(pytest, 'guest_id'):
        pytest.skip("No guest_id from previous test")
    r = session.get(f"{BASE_URL}/api/badge/{pytest.guest_id}")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "TEST_Guest User" in r.text
    print("Badge HTML generated successfully")

# --- XSS escape test ---
def test_badge_xss_escape(session):
    """Register a guest with HTML-like input and verify the badge escapes it."""
    xss_payload = {
        "name": "TEST_<script>alert(1)</script>",
        "email": f"test_xss_{int(time.time())}@example.com",
        "company": "<img src=x onerror=alert(2)>",
        "title": "CEO<b>",
        "city": "İstanbul",
        "expectations": "XSS"
    }
    r = session.post(f"{BASE_URL}/api/register/guest", json=xss_payload)
    assert r.status_code == 200
    gid = r.json()["id"]
    br = session.get(f"{BASE_URL}/api/badge/{gid}")
    assert br.status_code == 200
    body = br.text
    # Raw script tags must NOT appear in the rendered badge
    assert "<script>alert(1)</script>" not in body, "Unescaped <script> tag found in badge - XSS vulnerability!"
    assert "<img src=x onerror=alert(2)>" not in body, "Unescaped <img> tag with onerror found in badge - XSS vulnerability!"
    # Escaped versions should be present
    assert "&lt;script&gt;" in body or "&lt;script" in body
    print("Badge XSS escape verified")

# --- Admin Auth ---
def test_admin_login(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@arsayatirim.com", "password": "Admin@2026!"})
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"

def test_admin_login_wrong_password(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@arsayatirim.com", "password": "wrong"})
    assert r.status_code == 401

# --- Admin Protected Endpoints ---
def test_admin_dashboard(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "stats" in data
    assert "members" in data["stats"]
    print(f"Dashboard stats: {data['stats']}")

def test_admin_members_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/members")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_admin_guests_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/guests")
    assert r.status_code == 200

# --- Bulk email regression (SendGrid key not set expected) ---
def test_admin_bulk_email_no_sendgrid(admin_session):
    """Even without SendGrid API key, endpoint must not 500."""
    payload = {"subject": "Test", "content": "<p>hi</p>", "recipient_type": "members"}
    r = admin_session.post(f"{BASE_URL}/api/admin/email/send", json=payload)
    # Must be a graceful response, not server error
    assert r.status_code < 500, f"Bulk email endpoint errored: {r.status_code} {r.text}"
    print(f"Bulk email (no SendGrid) returned {r.status_code}")


def test_admin_speakers_get(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/speakers")
    assert r.status_code == 200

def test_admin_blog_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/blog")
    assert r.status_code == 200

def test_admin_banners_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/banners")
    assert r.status_code == 200

def test_admin_events_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/events")
    assert r.status_code == 200

def test_unauthenticated_admin_endpoint():
    # Use a fresh session with no cookies
    s = requests.Session()
    r = s.get(f"{BASE_URL}/api/admin/dashboard")
    assert r.status_code == 401
