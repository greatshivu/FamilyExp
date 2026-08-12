"""Backend API tests for Goat Farm Manager (iteration 3 — password policy,
deletion-approval workflow, breakdown report, admin edit, forgot/reset, phone field).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@farm.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")

GOOD_PW = "Pass@1234"
GOOD_PW_2 = "NewPass#9876"


# ---------- Helpers ----------
def _admin_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin():
    return _admin_session()


def _register(email: str, password: str = GOOD_PW, name: str = "TestUser",
              phone: str | None = None):
    body = {"email": email, "password": password, "name": name}
    if phone is not None:
        body["phone"] = phone
    return requests.post(f"{API}/auth/register", json=body)


def _login_session(email: str, password: str):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return s, r


def _cleanup_user(admin: requests.Session, email: str):
    users = admin.get(f"{API}/admin/users").json()
    u = next((x for x in users if x["email"] == email), None)
    if u:
        admin.delete(f"{API}/admin/users/{u['id']}")


@pytest.fixture
def approved_partner(admin):
    email = f"test_partner_{uuid.uuid4().hex[:8]}@test.com"
    phone = "+919999999999"
    rr = _register(email, phone=phone)
    assert rr.status_code == 200, rr.text
    users = admin.get(f"{API}/admin/users").json()
    me = next(u for u in users if u["email"] == email)
    ap = admin.post(f"{API}/admin/users/{me['id']}/approve")
    assert ap.status_code == 200
    s, lr = _login_session(email, GOOD_PW)
    assert lr.status_code == 200, lr.text
    me["__email"] = email
    me["__password"] = GOOD_PW
    yield s, {**me, "status": "approved"}
    admin.delete(f"{API}/admin/users/{me['id']}")


# ---------- Password policy ----------
class TestPasswordPolicy:
    @pytest.mark.parametrize("pw", [
        "short1!",      # <8
        "alllowercase", # no digit, no special
        "12345678",     # no letter, no special
        "abcdefgh",     # no digit/special
        "Password1",    # no special
        "Password!",    # no digit
    ])
    def test_register_rejects_weak_password(self, pw):
        email = f"weak_{uuid.uuid4().hex[:8]}@test.com"
        r = _register(email, password=pw)
        assert r.status_code == 400, f"expected 400 for {pw!r}, got {r.status_code}"
        d = r.json()
        # Helpful detail message
        assert "8" in d.get("detail", "") or "password" in d.get("detail", "").lower()

    def test_register_accepts_strong_password(self, admin):
        email = f"strong_{uuid.uuid4().hex[:8]}@test.com"
        r = _register(email, password=GOOD_PW)
        assert r.status_code == 200, r.text
        _cleanup_user(admin, email)

    def test_change_password_rejects_weak(self, approved_partner):
        s, _ = approved_partner
        r = s.post(f"{API}/auth/change-password",
                   json={"current_password": GOOD_PW, "new_password": "weakpw"})
        assert r.status_code == 400

    def test_reset_password_rejects_weak(self):
        r = requests.post(f"{API}/auth/reset-password",
                          json={"token": "anything", "new_password": "weak"})
        assert r.status_code == 400


# ---------- Forgot/Reset password ----------
class TestForgotReset:
    def test_forgot_password_always_200(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": f"nonexistent_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_forgot_for_approved_user(self, admin, approved_partner):
        _, partner = approved_partner
        r = requests.post(f"{API}/auth/forgot-password", json={"email": partner["__email"]})
        assert r.status_code == 200

    def test_admin_send_reset_link_and_use(self, admin):
        email = f"reset_user_{uuid.uuid4().hex[:8]}@test.com"
        assert _register(email).status_code == 200
        users = admin.get(f"{API}/admin/users").json()
        u = next(x for x in users if x["email"] == email)
        admin.post(f"{API}/admin/users/{u['id']}/approve")

        # admin generates reset link
        r = admin.post(f"{API}/admin/users/{u['id']}/send-reset-link")
        assert r.status_code == 200, r.text
        reset_url = r.json().get("reset_url")
        assert reset_url and "token=" in reset_url
        token = reset_url.split("token=", 1)[1]

        # use token to reset
        rr = requests.post(f"{API}/auth/reset-password",
                           json={"token": token, "new_password": GOOD_PW_2})
        assert rr.status_code == 200

        # reuse same token -> 400 "already used"
        rr2 = requests.post(f"{API}/auth/reset-password",
                            json={"token": token, "new_password": GOOD_PW_2})
        assert rr2.status_code == 400
        assert "used" in rr2.json()["detail"].lower() or "invalid" in rr2.json()["detail"].lower()

        # login with new password works
        _, lr = _login_session(email, GOOD_PW_2)
        assert lr.status_code == 200

        admin.delete(f"{API}/admin/users/{u['id']}")

    def test_invalid_reset_token(self):
        r = requests.post(f"{API}/auth/reset-password",
                          json={"token": "bogus-token-xxx", "new_password": GOOD_PW})
        assert r.status_code == 400


# ---------- Profile (with phone) ----------
class TestProfileAndPhone:
    def test_profile_name_and_phone(self, approved_partner):
        s, _ = approved_partner
        new_name = f"Updated_{uuid.uuid4().hex[:6]}"
        new_phone = "+15551234567"
        r = s.patch(f"{API}/auth/profile", json={"name": new_name, "phone": new_phone})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == new_name
        assert data["phone"] == new_phone
        me = s.get(f"{API}/auth/me").json()
        assert me["phone"] == new_phone

    def test_phone_flows_via_register_me_admin_list(self, admin):
        email = f"phone_user_{uuid.uuid4().hex[:8]}@test.com"
        phone = "+918888888888"
        assert _register(email, phone=phone).status_code == 200
        users = admin.get(f"{API}/admin/users").json()
        u = next(x for x in users if x["email"] == email)
        assert u.get("phone") == phone
        admin.post(f"{API}/admin/users/{u['id']}/approve")
        s, _ = _login_session(email, GOOD_PW)
        me = s.get(f"{API}/auth/me").json()
        assert me.get("phone") == phone
        admin.delete(f"{API}/admin/users/{u['id']}")


# ---------- Admin edit user ----------
class TestAdminEditUser:
    def test_admin_edit_name_email_phone(self, admin):
        email = f"edit_{uuid.uuid4().hex[:8]}@test.com"
        assert _register(email).status_code == 200
        users = admin.get(f"{API}/admin/users").json()
        u = next(x for x in users if x["email"] == email)
        new_email = f"renamed_{uuid.uuid4().hex[:6]}@test.com"
        r = admin.patch(f"{API}/admin/users/{u['id']}",
                        json={"name": "Renamed", "email": new_email, "phone": "+12223334444"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "Renamed"
        assert d["email"] == new_email
        assert d["phone"] == "+12223334444"
        admin.delete(f"{API}/admin/users/{u['id']}")

    def test_admin_edit_duplicate_email_400(self, admin):
        e1 = f"dup1_{uuid.uuid4().hex[:8]}@test.com"
        e2 = f"dup2_{uuid.uuid4().hex[:8]}@test.com"
        assert _register(e1).status_code == 200
        assert _register(e2).status_code == 200
        users = admin.get(f"{API}/admin/users").json()
        u2 = next(x for x in users if x["email"] == e2)
        r = admin.patch(f"{API}/admin/users/{u2['id']}", json={"email": e1})
        assert r.status_code == 400
        _cleanup_user(admin, e1)
        _cleanup_user(admin, e2)

    def test_non_admin_cannot_edit_user(self, approved_partner):
        s, partner = approved_partner
        r = s.patch(f"{API}/admin/users/{partner['id']}", json={"name": "x"})
        assert r.status_code == 403


# ---------- Deletion-approval workflow ----------
class TestDeletionWorkflow:
    def test_partner_creates_pending_request(self, admin, approved_partner):
        s, _ = approved_partner
        # create income (admin)
        inc = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 100,
                                                 "date": "2026-01-10"}).json()
        # partner files deletion request
        r = s.post(f"{API}/deletion-requests",
                   json={"resource_type": "income", "resource_id": inc["id"],
                         "reason": "duplicate"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert "id" in d
        req_id = d["id"]

        # GET /incomes shows pending_deletion=true
        rows = admin.get(f"{API}/incomes").json()
        target = next(x for x in rows if x["id"] == inc["id"])
        assert target["pending_deletion"] is True

        # transactions report also has flag
        tx = admin.get(f"{API}/reports/transactions").json()
        tx_row = next(x for x in tx if x.get("id") == inc["id"])
        assert tx_row["pending_deletion"] is True

        # duplicate request returns same pending id
        r2 = s.post(f"{API}/deletion-requests",
                    json={"resource_type": "income", "resource_id": inc["id"]})
        assert r2.status_code == 200
        assert r2.json()["id"] == req_id

        # admin approves -> resource deleted
        ap = admin.post(f"{API}/deletion-requests/{req_id}/approve")
        assert ap.status_code == 200
        rows = admin.get(f"{API}/incomes").json()
        assert not any(x["id"] == inc["id"] for x in rows)

    def test_reject_keeps_resource_and_clears_flag(self, admin, approved_partner):
        s, _ = approved_partner
        inc = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 200,
                                                 "date": "2026-01-11"}).json()
        r = s.post(f"{API}/deletion-requests",
                   json={"resource_type": "income", "resource_id": inc["id"]})
        req_id = r.json()["id"]
        rj = admin.post(f"{API}/deletion-requests/{req_id}/reject")
        assert rj.status_code == 200
        # resource still exists, pending_deletion false now
        rows = admin.get(f"{API}/incomes").json()
        target = next(x for x in rows if x["id"] == inc["id"])
        assert target["pending_deletion"] is False
        admin.delete(f"{API}/incomes/{inc['id']}")

    def test_admin_deletion_request_immediate(self, admin):
        inc = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 50,
                                                 "date": "2026-01-10"}).json()
        r = admin.post(f"{API}/deletion-requests",
                       json={"resource_type": "income", "resource_id": inc["id"]})
        assert r.status_code == 200
        assert r.json()["status"] == "deleted"
        rows = admin.get(f"{API}/incomes").json()
        assert not any(x["id"] == inc["id"] for x in rows)

    def test_partner_direct_delete_forbidden(self, admin, approved_partner):
        s, _ = approved_partner
        inc = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 30,
                                                 "date": "2026-01-12"}).json()
        # NOTE: /api/incomes/{id} DELETE is currently NOT admin-only in server.py
        r = s.delete(f"{API}/incomes/{inc['id']}")
        # cleanup either way
        admin.delete(f"{API}/incomes/{inc['id']}")
        assert r.status_code == 403, (
            f"Partners should not be able to DELETE /api/incomes/{{id}} directly — got {r.status_code}"
        )

    def test_partner_direct_delete_expense_forbidden(self, admin, approved_partner):
        s, _ = approved_partner
        exp = admin.post(f"{API}/expenses", json={"category": "Labor", "amount": 80,
                                                  "date": "2026-01-12",
                                                  "paid_from": "account"}).json()
        r = s.delete(f"{API}/expenses/{exp['id']}")
        admin.delete(f"{API}/expenses/{exp['id']}")
        assert r.status_code == 403

    def test_deletion_request_404_for_unknown_resource(self, approved_partner):
        s, _ = approved_partner
        r = s.post(f"{API}/deletion-requests",
                   json={"resource_type": "income", "resource_id": "does-not-exist"})
        assert r.status_code == 404


# ---------- Reports breakdown ----------
class TestReportsBreakdown:
    @pytest.mark.parametrize("typ", ["income", "expense", "investment"])
    def test_breakdown_shape(self, admin, typ):
        r = admin.get(f"{API}/reports/breakdown", params={"type": typ})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == typ
        assert isinstance(d["current_year"], int)
        assert isinstance(d["total"], (int, float))
        assert isinstance(d["monthly"], list) and len(d["monthly"]) == 12
        cy = d["current_year"]
        for m in d["monthly"]:
            assert m["month"].startswith(f"{cy}-")
        assert isinstance(d["yearly"], list) and len(d["yearly"]) <= 6

    def test_breakdown_totals_consistent(self, admin):
        # seed one income for current year
        from datetime import datetime as _dt
        cy = _dt.utcnow().year
        inc = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 123.0,
                                                 "date": f"{cy}-06-15"}).json()
        d = admin.get(f"{API}/reports/breakdown", params={"type": "income"}).json()
        m_sum = sum(m["amount"] for m in d["monthly"])
        assert d["total"] >= 123.0
        # monthly current-year totals <= overall total
        assert m_sum <= d["total"] + 0.01
        admin.delete(f"{API}/incomes/{inc['id']}")


# ---------- Existing core flows ----------
class TestAuthBasics:
    def test_unauth_me(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_login_bad_pw(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_admin_me(self, admin):
        r = admin.get(f"{API}/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        assert d["status"] == "approved"


class TestApprovalFlow:
    def test_register_pending(self, admin):
        email = f"pend_{uuid.uuid4().hex[:8]}@test.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": GOOD_PW, "name": "X"})
        assert r.status_code == 200
        assert r.json()["status"] == "pending"
        assert "access_token" not in s.cookies
        _cleanup_user(admin, email)

    def test_pending_login_403(self, admin):
        email = f"pend2_{uuid.uuid4().hex[:8]}@test.com"
        _register(email)
        _, r = _login_session(email, GOOD_PW)
        assert r.status_code == 403
        _cleanup_user(admin, email)

    def test_duplicate_register_400(self, admin):
        email = f"dup_{uuid.uuid4().hex[:8]}@test.com"
        _register(email)
        r2 = _register(email)
        assert r2.status_code == 400
        _cleanup_user(admin, email)


class TestPartnersDropdown:
    def test_partners_includes_approved(self, admin, approved_partner):
        _, partner = approved_partner
        r = admin.get(f"{API}/users/partners")
        assert r.status_code == 200
        ids = {u["id"] for u in r.json()}
        assert partner["id"] in ids


class TestIncomesExpensesInvestments:
    def test_income_crud(self, admin):
        r = admin.post(f"{API}/incomes", json={"category": "Milk", "amount": 100,
                                               "date": "2026-01-15"})
        assert r.status_code == 200
        iid = r.json()["id"]
        rl = admin.get(f"{API}/incomes")
        assert any(x["id"] == iid for x in rl.json())
        # admin direct delete still works
        rd = admin.delete(f"{API}/incomes/{iid}")
        assert rd.status_code == 200

    def test_pocket_expense_creates_investment(self, admin, approved_partner):
        _, partner = approved_partner
        pid = partner["id"]
        re = admin.post(f"{API}/expenses", json={
            "category": "Feeds", "amount": 500, "date": "2026-01-10",
            "paid_from": "pocket", "partner_id": pid
        })
        assert re.status_code == 200
        eid = re.json()["id"]
        ri = admin.get(f"{API}/investments").json()
        assert any(x.get("ref_expense_id") == eid for x in ri)
        admin.delete(f"{API}/expenses/{eid}")

    def test_direct_investment(self, admin, approved_partner):
        _, partner = approved_partner
        r = admin.post(f"{API}/investments",
                       json={"partner_id": partner["id"], "amount": 1000, "date": "2026-01-05"})
        assert r.status_code == 200
        iid = r.json()["id"]
        admin.delete(f"{API}/investments/{iid}")


class TestUnauth:
    @pytest.mark.parametrize("path", [
        "/categories", "/incomes", "/expenses", "/investments",
        "/reports/summary", "/reports/breakdown?type=income",
        "/deletion-requests", "/users/partners", "/admin/users",
    ])
    def test_unauth_get_returns_401(self, path):
        r = requests.get(f"{API}{path}")
        assert r.status_code == 401
