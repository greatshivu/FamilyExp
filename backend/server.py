from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import secrets
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import psutil
import socket
import time

from emails import (
    email_account_created, email_admin_new_signup, email_account_approved,
    email_account_rejected, email_account_deleted, email_password_reset,
)

# ---------------- Setup ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

audit_mongo_url = os.environ["AUDIT_MONGO_URL"]
audit_client = AsyncIOMotorClient(audit_mongo_url)
audit_db = audit_client[os.environ["AUDIT_DB_NAME"]]

JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 24
REFRESH_DAYS = 30
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
PASSWORD_HELP = "Password must be at least 8 characters and include a letter, a number, and a special character."

PASSWORD_RE_LETTER = re.compile(r"[A-Za-z]")
PASSWORD_RE_DIGIT = re.compile(r"\d")
PASSWORD_RE_SPECIAL = re.compile(r"[^A-Za-z0-9]")

def validate_password(pw: str) -> None:
    if len(pw) < 8 or not PASSWORD_RE_LETTER.search(pw) or not PASSWORD_RE_DIGIT.search(pw) \
            or not PASSWORD_RE_SPECIAL.search(pw):
        raise HTTPException(status_code=400, detail=PASSWORD_HELP)

app = FastAPI(title="Family Exponse")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("familyexponse")


# ---------------- Auth helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                    max_age=ACCESS_MIN * 60, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                    max_age=REFRESH_DAYS * 86400, path="/")


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_h = request.headers.get("Authorization", "")
        if auth_h.startswith("Bearer "):
            token = auth_h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("status") != "approved":
            raise HTTPException(status_code=403, detail="Account is not approved")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------- Models ----------------
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "partner"
    status: str = "pending"
    created_at: str


class ProfileUpdateIn(BaseModel):
    name: str
    phone: Optional[str] = None


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class AdminUserEditIn(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


class DeletionRequestIn(BaseModel):
    resource_type: Literal["income", "expense", "investment", "category"]
    resource_id: str
    reason: Optional[str] = None


class PartnerIn(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = None


class Partner(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = None
    created_at: str


class CategoryIn(BaseModel):
    name: str
    type: Literal["income", "expense"]


class Category(BaseModel):
    id: str
    name: str
    type: Literal["income", "expense"]
    created_at: str


class IncomeIn(BaseModel):
    category: str
    amount: float
    date: str  # YYYY-MM-DD
    note: Optional[str] = None
    attachment: Optional[str] = None


class Income(BaseModel):
    id: str
    category: str
    amount: float
    date: str
    note: Optional[str] = None
    attachment: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str


class ExpenseIn(BaseModel):
    category: str
    amount: float
    date: str
    note: Optional[str] = None
    paid_from: Literal["account", "pocket"]
    partner_id: Optional[str] = None  # required if paid_from == pocket
    attachment: Optional[str] = None


class Expense(BaseModel):
    id: str
    category: str
    amount: float
    date: str
    note: Optional[str] = None
    paid_from: Literal["account", "pocket"]
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    attachment: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str


class InvestmentIn(BaseModel):
    partner_id: str
    amount: float
    date: str
    note: Optional[str] = None
    attachment: Optional[str] = None


class Investment(BaseModel):
    id: str
    partner_id: str
    partner_name: str
    amount: float
    date: str
    note: Optional[str] = None
    attachment: Optional[str] = None
    source: Literal["direct", "expense"] = "direct"
    ref_expense_id: Optional[str] = None
    created_by: str
    created_at: str


class NoteIn(BaseModel):
    content: str


class Note(BaseModel):
    id: str
    user_id: str
    content: str
    created_at: str
    updated_at: str


class ReplyIn(BaseModel):
    content: str


class Reply(BaseModel):
    id: str
    author_id: str
    author_name: str
    content: str
    created_at: str


class CommonNoteIn(BaseModel):
    content: str


class CommonNote(BaseModel):
    id: str
    author_id: str
    author_name: str
    content: str
    replies: List[Reply] = []
    created_at: str
    updated_at: str


class FarmUpdateIn(BaseModel):
    image: str  # base64 compressed
    note: Optional[str] = None


class FarmUpdate(BaseModel):
    id: str
    image: str
    note: Optional[str] = None
    author_id: str
    author_name: str
    created_at: str


class AuditLog(BaseModel):
    id: str
    user_id: str
    user_name: str
    action: Literal["Add", "Update", "Delete"]
    resource_type: Literal["income", "expense", "investment"]
    resource_id: str
    amount: float
    category: Optional[str] = None
    date: str
    created_at: str


# ---------------- Seed ----------------
DEFAULT_CATEGORIES = [
    ("Milk", "income"),
    ("Ghee", "income"),
    ("Cheese", "income"),
    ('Trading', 'income'),
    ("Flower Sales", "income"),
    ("Banana Sales", "income"),
    ("Transportation", "expense"),
    ("Labor", "expense"),
    ("Power Bill", "expense"),
    ("Pesticides", "expense"),
    ("Medicines", "expense"),
    ("Feeds", "expense"),
    ("Grass Cutting", "expense"),
    ("Repairs", "expense"),
    ("Field Expenses", "expense"),
]


async def seed_defaults():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.categories.create_index([("name", 1), ("type", 1)], unique=True)
    await db.incomes.create_index("date")
    await db.expenses.create_index("date")
    await db.investments.create_index("partner_id")
    await db.deletion_requests.create_index("status")
    await db.deletion_requests.create_index([("resource_type", 1), ("resource_id", 1)])
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.notes.create_index("user_id")
    await db.common_notes.create_index("created_at")
    await db.farm_updates.create_index("created_at")
    await audit_db.audits.create_index("created_at")
    await audit_db.audits.create_index("resource_type")
    await audit_db.audits.create_index("resource_id")
    await audit_db.audits.create_index("user_id")
    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@farm.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "status": "approved",
            "password_hash": hash_password(admin_password),
            "created_at": utc_now_iso(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    else:
        updates = {}
        if existing.get("status") != "approved":
            updates["status"] = "approved"
        if existing.get("role") != "admin":
            updates["role"] = "admin"
        if not verify_password(admin_password, existing["password_hash"]):
            updates["password_hash"] = hash_password(admin_password)
        if updates:
            await db.users.update_one({"email": admin_email}, {"$set": updates})

    # Backfill: any user missing status -> mark as approved (legacy data)
    await db.users.update_many({"status": {"$exists": False}}, {"$set": {"status": "approved"}})

    # Drop legacy partners collection (now unified with users)
    try:
        await db.partners.drop()
    except Exception:
        pass

    # Categories
    for name, typ in DEFAULT_CATEGORIES:
        await db.categories.update_one(
            {"name": name, "type": typ},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name, "type": typ,
                              "created_at": utc_now_iso()}},
            upsert=True,
        )

async def create_audit(user: dict, action: str, resource_type: str, resource_id: str, amount: float, date: str, category: str = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "amount": amount,
        "category": category,
        "date": date,
        "created_at": utc_now_iso()
    }
    await audit_db.audits.insert_one(doc)

@app.on_event("startup")
async def on_startup():
    await seed_defaults()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/details")
def health_details():
    return {
        "status": "ok",
        "hostname": socket.gethostname(),
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "uptime_seconds": time.time() - psutil.boot_time(),
    }

@app.get("/health/db")
async def health_db():
    try:
        # MongoDB ping command
        result = await db.command("ping")
        return {"database": "connected", "result": result}
    except Exception as e:
        return {"database": "error", "details": str(e)}

# ---------------- Auth routes ----------------
@api.post("/auth/register")
async def register(payload: RegisterIn, background: BackgroundTasks):
    email = payload.email.lower()
    validate_password(payload.password)
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "phone": payload.phone,
        "role": "partner",
        "status": "pending",
        "password_hash": hash_password(payload.password),
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user)
    # Notify user + every admin
    background.add_task(email_account_created, email, payload.name)
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "email": 1}).to_list(50)
    for a in admins:
        background.add_task(email_admin_new_signup, a["email"], payload.name, email, FRONTEND_URL)
    return {
        "ok": True,
        "message": "Account created. Please wait for admin approval before signing in.",
        "status": "pending",
    }


@api.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response):
    print("CORS_ORIGINS:", os.environ.get("CORS_ORIGINS"))
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    status = user.get("status", "pending")
    if status == "pending":
        raise HTTPException(status_code=403, detail="Your account is awaiting admin approval.")
    if status == "rejected":
        raise HTTPException(status_code=403, detail="Your account has been rejected. Contact the admin.")
    if status != "approved":
        raise HTTPException(status_code=403, detail="Account is not active.")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return UserOut(**user)


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@api.patch("/auth/profile", response_model=UserOut)
async def update_profile(payload: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    updates = {"name": name, "phone": (payload.phone or "").strip() or None}
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    user.update(updates)
    return UserOut(**user)


@api.post("/auth/change-password")
async def change_password(payload: PasswordChangeIn, user: dict = Depends(get_current_user)):
    validate_password(payload.new_password)
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, background: BackgroundTasks):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return ok to avoid email enumeration
    if user and user.get("status") == "approved":
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        background.add_task(email_password_reset, email, user.get("name", "there"), reset_url)
        logger.info(f"Password reset link for {email}: {reset_url}")
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    validate_password(payload.new_password)
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or already used reset token")
    exp = rec.get("expires_at")
    if isinstance(exp, datetime) and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    await db.users.update_one(
        {"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ---------------- Admin: account management ----------------
@api.get("/admin/users")
async def admin_list_users(_: dict = Depends(get_admin_user)):
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return rows


@api.post("/admin/users/{user_id}/approve")
async def admin_approve(user_id: str, background: BackgroundTasks, _: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"status": "approved"}})
    background.add_task(email_account_approved, user["email"], user.get("name", "there"), FRONTEND_URL)
    return {"ok": True}


@api.post("/admin/users/{user_id}/reject")
async def admin_reject(user_id: str, background: BackgroundTasks, _: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"status": "rejected"}})
    background.add_task(email_account_rejected, user["email"], user.get("name", "there"))
    return {"ok": True}


@api.patch("/admin/users/{user_id}", response_model=UserOut)
async def admin_edit_user(user_id: str, payload: AdminUserEditIn, _: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {}
    if payload.name is not None and payload.name.strip():
        updates["name"] = payload.name.strip()
    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != user["email"]:
            other = await db.users.find_one({"email": new_email})
            if other:
                raise HTTPException(status_code=400, detail="Email already in use")
            updates["email"] = new_email
    if payload.phone is not None:
        updates["phone"] = payload.phone.strip() or None
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
        user.update(updates)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return UserOut(**user)


@api.post("/admin/users/{user_id}/send-reset-link")
async def admin_send_reset_link(user_id: str, background: BackgroundTasks, _: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
    })
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    background.add_task(email_password_reset, user["email"], user.get("name", "there"), reset_url)
    logger.info(f"Admin-triggered reset link for {user['email']}: {reset_url}")
    return {"ok": True, "reset_url": reset_url}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, background: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin account")
    await db.users.delete_one({"id": user_id})
    background.add_task(email_account_deleted, target["email"], target.get("name", "there"))
    return {"ok": True}


# ---------------- Deletion-approval workflow ----------------
COLLECTION_MAP = {
    "income": "incomes",
    "expense": "expenses",
    "investment": "investments",
    "category": "categories",
}


async def _resource_exists(resource_type: str, resource_id: str) -> Optional[dict]:
    coll = COLLECTION_MAP.get(resource_type)
    if not coll:
        return None
    return await db[coll].find_one({"id": resource_id}, {"_id": 0})


async def _do_delete(resource_type: str, resource_id: str):
    """Actually delete the resource. For expenses, also remove linked auto-investment."""
    coll = COLLECTION_MAP[resource_type]
    if resource_type == "expense":
        await db.investments.delete_many({"ref_expense_id": resource_id})
    await db[coll].delete_one({"id": resource_id})


async def _pending_deletion_ids(resource_type: str) -> set:
    """Set of resource_ids that have a pending deletion request for the given resource_type."""
    cur = db.deletion_requests.find(
        {"resource_type": resource_type, "status": "pending"},
        {"_id": 0, "resource_id": 1},
    )
    return {r["resource_id"] async for r in cur}


@api.post("/deletion-requests")
async def request_deletion(payload: DeletionRequestIn, user: dict = Depends(get_current_user)):
    rsc = await _resource_exists(payload.resource_type, payload.resource_id)
    if not rsc:
        raise HTTPException(status_code=404, detail="Resource not found")
    # Admin → delete immediately
    if user.get("role") == "admin":
        await _do_delete(payload.resource_type, payload.resource_id)
        return {"ok": True, "status": "deleted"}
    # Prevent duplicate pending requests
    existing = await db.deletion_requests.find_one({
        "resource_type": payload.resource_type,
        "resource_id": payload.resource_id,
        "status": "pending",
    })
    if existing:
        return {"ok": True, "status": "pending", "id": existing["id"]}
    doc = {
        "id": str(uuid.uuid4()),
        "resource_type": payload.resource_type,
        "resource_id": payload.resource_id,
        "resource_snapshot": rsc,
        "reason": payload.reason,
        "requested_by": user["id"],
        "requested_by_name": user["name"],
        "status": "pending",
        "requested_at": utc_now_iso(),
        "decided_by": None,
        "decided_at": None,
    }
    await db.deletion_requests.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "status": "pending", "id": doc["id"]}


@api.get("/deletion-requests")
async def list_deletion_requests(
    status: Optional[Literal["pending", "approved", "rejected"]] = None,
    _: dict = Depends(get_current_user),
):
    q = {"status": status} if status else {}
    rows = await db.deletion_requests.find(q, {"_id": 0}).sort("requested_at", -1).to_list(500)
    return rows


@api.post("/deletion-requests/{req_id}/approve")
async def approve_deletion(req_id: str, admin: dict = Depends(get_admin_user)):
    req = await db.deletion_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Deletion request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already decided")
    await _do_delete(req["resource_type"], req["resource_id"])
    await db.deletion_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "approved", "decided_by": admin["id"], "decided_at": utc_now_iso()}},
    )
    return {"ok": True}


@api.post("/deletion-requests/{req_id}/reject")
async def reject_deletion(req_id: str, admin: dict = Depends(get_admin_user)):
    req = await db.deletion_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Deletion request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already decided")
    await db.deletion_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "rejected", "decided_by": admin["id"], "decided_at": utc_now_iso()}},
    )
    return {"ok": True}


# ---------------- Approved partners (for dropdowns) ----------------
@api.get("/users/partners")
async def list_partner_users(_: dict = Depends(get_current_user)):
    rows = await db.users.find(
        {"status": "approved"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1},
    ).sort("name", 1).to_list(500)
    return rows


# ---------------- Partners (legacy — kept for backward compat, returns empty) ----------------
@api.get("/partners")
async def list_partners(_: dict = Depends(get_current_user)):
    return []


@api.post("/partners")
async def create_partner_deprecated(_: dict = Depends(get_current_user)):
    raise HTTPException(status_code=410, detail="Partners are now managed via user accounts. Ask admin to approve a registered partner.")


# ---------------- Categories ----------------
@api.get("/categories")
async def list_categories(_: dict = Depends(get_current_user)):
    rows = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    pending = await _pending_deletion_ids("category")
    for r in rows:
        r["pending_deletion"] = r["id"] in pending
    return rows


@api.post("/categories", response_model=Category)
async def create_category(payload: CategoryIn, _: dict = Depends(get_current_user)):
    existing = await db.categories.find_one({"name": payload.name, "type": payload.type}, {"_id": 0})
    if existing:
        return existing
    doc = {"id": str(uuid.uuid4()), "name": payload.name, "type": payload.type,
           "created_at": utc_now_iso()}
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, _: dict = Depends(get_admin_user)):
    await db.categories.delete_one({"id": cat_id})
    await db.deletion_requests.delete_many({"resource_type": "category", "resource_id": cat_id})
    return {"ok": True}


# ---------------- Helpers ----------------
async def _partner_name(pid: Optional[str]) -> Optional[str]:
    if not pid:
        return None
    p = await db.users.find_one({"id": pid}, {"_id": 0, "name": 1})
    return p["name"] if p else None


# ---------------- Incomes ----------------
@api.get("/incomes")
async def list_incomes(_: dict = Depends(get_current_user)):
    rows = await db.incomes.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    pending = await _pending_deletion_ids("income")
    for r in rows:
        r["pending_deletion"] = r["id"] in pending
    return rows


@api.post("/incomes", response_model=Income)
async def create_income(payload: IncomeIn, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        **payload.model_dump(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": utc_now_iso(),
    }
    await db.incomes.insert_one(doc)
    await create_audit(user, "Add", "income", doc_id, payload.amount, payload.date, payload.category)
    doc.pop("_id", None)
    return doc


@api.delete("/incomes/{income_id}")
async def delete_income(income_id: str, user: dict = Depends(get_admin_user)):
    existing = await db.incomes.find_one({"id": income_id})
    if existing:
        await create_audit(user, "Delete", "income", income_id, existing["amount"], existing["date"], existing["category"])
    await db.incomes.delete_one({"id": income_id})
    await db.deletion_requests.delete_many({"resource_type": "income", "resource_id": income_id})
    return {"ok": True}


@api.put("/incomes/{income_id}", response_model=Income)
async def update_income(income_id: str, payload: IncomeIn, user: dict = Depends(get_current_user)):
    existing = await db.incomes.find_one({"id": income_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Income not found")
    if user["role"] != "admin" and existing["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this income")
    update_data = payload.model_dump()
    await db.incomes.update_one({"id": income_id}, {"$set": update_data})
    await create_audit(user, "Update", "income", income_id, payload.amount, payload.date, payload.category)
    updated = await db.incomes.find_one({"id": income_id}, {"_id": 0})
    return updated


# ---------------- Expenses ----------------
@api.get("/expenses")
async def list_expenses(_: dict = Depends(get_current_user)):
    rows = await db.expenses.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    pending = await _pending_deletion_ids("expense")
    for r in rows:
        r["pending_deletion"] = r["id"] in pending
    return rows


@api.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseIn, user: dict = Depends(get_current_user)):
    if payload.paid_from == "pocket" and not payload.partner_id:
        raise HTTPException(status_code=400, detail="partner_id required when paid_from is pocket")
    partner_name = await _partner_name(payload.partner_id)
    if payload.paid_from == "pocket" and not partner_name:
        raise HTTPException(status_code=404, detail="Partner not found")

    exp_id = str(uuid.uuid4())
    exp_doc = {
        "id": exp_id,
        **payload.model_dump(),
        "partner_name": partner_name,
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": utc_now_iso(),
    }
    await db.expenses.insert_one(exp_doc)
    await create_audit(user, "Add", "expense", exp_id, payload.amount, payload.date, payload.category)
    exp_doc.pop("_id", None)

    # Auto-create Investment when paid from pocket
    if payload.paid_from == "pocket":
        inv_id = str(uuid.uuid4())
        inv_doc = {
            "id": inv_id,
            "partner_id": payload.partner_id,
            "partner_name": partner_name,
            "amount": payload.amount,
            "date": payload.date,
            "note": f"Auto from expense: {payload.category}" + (f" - {payload.note}" if payload.note else ""),
            "source": "expense",
            "ref_expense_id": exp_id,
            "created_by": user["id"],
            "created_at": utc_now_iso(),
        }
        await db.investments.insert_one(inv_doc)
        await create_audit(user, "Add", "investment", inv_id, payload.amount, payload.date, "Auto-Expense")

    return exp_doc


@api.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_admin_user)):
    # Also remove linked auto investment
    linked_invs = await db.investments.find({"ref_expense_id": expense_id}).to_list(100)
    for li in linked_invs:
         await create_audit(user, "Delete", "investment", li["id"], li["amount"], li["date"], "Auto-Expense")
    await db.investments.delete_many({"ref_expense_id": expense_id})
    
    existing = await db.expenses.find_one({"id": expense_id})
    if existing:
        await create_audit(user, "Delete", "expense", expense_id, existing["amount"], existing["date"], existing["category"])
    
    await db.expenses.delete_one({"id": expense_id})
    await db.deletion_requests.delete_many({"resource_type": "expense", "resource_id": expense_id})
    return {"ok": True}


@api.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseIn, user: dict = Depends(get_current_user)):
    existing = await db.expenses.find_one({"id": expense_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    if user["role"] != "admin" and existing["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this expense")

    if payload.paid_from == "pocket" and not payload.partner_id:
        raise HTTPException(status_code=400, detail="partner_id required when paid_from is pocket")
    partner_name = await _partner_name(payload.partner_id)
    if payload.paid_from == "pocket" and not partner_name:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = payload.model_dump()
    update_data["partner_name"] = partner_name
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    await create_audit(user, "Update", "expense", expense_id, payload.amount, payload.date, payload.category)

    # Update linked investment
    linked_invs = await db.investments.find({"ref_expense_id": expense_id}).to_list(100)
    for li in linked_invs:
         await create_audit(user, "Delete", "investment", li["id"], li["amount"], li["date"], "Auto-Expense-Update")
    await db.investments.delete_many({"ref_expense_id": expense_id})
    
    if payload.paid_from == "pocket":
        inv_id = str(uuid.uuid4())
        inv_doc = {
            "id": inv_id,
            "partner_id": payload.partner_id,
            "partner_name": partner_name,
            "amount": payload.amount,
            "date": payload.date,
            "note": f"Auto from expense: {payload.category}" + (f" - {payload.note}" if payload.note else ""),
            "source": "expense",
            "ref_expense_id": expense_id,
            "created_by": existing["created_by"],
            "created_at": existing["created_at"],
        }
        await db.investments.insert_one(inv_doc)
        await create_audit(user, "Add", "investment", inv_id, payload.amount, payload.date, "Auto-Expense-Update")

    updated = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    return updated


# ---------------- Investments ----------------
@api.get("/investments")
async def list_investments(_: dict = Depends(get_current_user)):
    rows = await db.investments.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    pending = await _pending_deletion_ids("investment")
    for r in rows:
        r["pending_deletion"] = r["id"] in pending
    return rows


@api.post("/investments", response_model=Investment)
async def create_investment(payload: InvestmentIn, user: dict = Depends(get_current_user)):
    partner_name = await _partner_name(payload.partner_id)
    if not partner_name:
        raise HTTPException(status_code=404, detail="Partner not found")
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        **payload.model_dump(),
        "partner_name": partner_name,
        "source": "direct",
        "ref_expense_id": None,
        "created_by": user["id"],
        "created_at": utc_now_iso(),
    }
    await db.investments.insert_one(doc)
    await create_audit(user, "Add", "investment", doc_id, payload.amount, payload.date, f"Partner: {partner_name}")
    doc.pop("_id", None)
    return doc


@api.delete("/investments/{inv_id}")
async def delete_investment(inv_id: str, user: dict = Depends(get_admin_user)):
    inv = await db.investments.find_one({"id": inv_id}, {"_id": 0})
    if inv and inv.get("source") == "expense":
        raise HTTPException(status_code=400,
                            detail="Cannot delete auto-investment. Delete the linked expense instead.")
    if inv:
        await create_audit(user, "Delete", "investment", inv_id, inv["amount"], inv["date"], f"Partner: {inv.get('partner_name')}")
    await db.investments.delete_one({"id": inv_id})
    await db.deletion_requests.delete_many({"resource_type": "investment", "resource_id": inv_id})
    return {"ok": True}


@api.put("/investments/{inv_id}", response_model=Investment)
async def update_investment(inv_id: str, payload: InvestmentIn, user: dict = Depends(get_current_user)):
    existing = await db.investments.find_one({"id": inv_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    if user["role"] != "admin" and existing["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this investment")
    if existing.get("source") == "expense":
        raise HTTPException(status_code=400, detail="Cannot edit auto-investment. Edit the linked expense instead.")

    partner_name = await _partner_name(payload.partner_id)
    if not partner_name:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = payload.model_dump()
    update_data["partner_name"] = partner_name
    await db.investments.update_one({"id": inv_id}, {"$set": update_data})
    await create_audit(user, "Update", "investment", inv_id, payload.amount, payload.date, f"Partner: {partner_name}")
    updated = await db.investments.find_one({"id": inv_id}, {"_id": 0})
    return updated


# ---------------- Reports ----------------
@api.get("/reports/summary")
async def report_summary(_: dict = Depends(get_current_user)):
    incomes = await db.incomes.find({}, {"_id": 0, "amount": 1, "paid_from": 1}).to_list(10000)
    expenses = await db.expenses.find({}, {"_id": 0, "amount": 1, "paid_from": 1}).to_list(10000)
    investments = await db.investments.find({}, {"_id": 0, "amount": 1}).to_list(10000)

    total_income = sum(i["amount"] for i in incomes)
    total_expense = sum(e["amount"] for e in expenses)
    total_investment = sum(i["amount"] for i in investments)
    expense_from_account = sum(e["amount"] for e in expenses if e.get("paid_from") == "account")
    # Account balance: investments + income - expenses-from-account
    account_balance = total_investment + total_income - total_expense
    net_pl = total_income - total_expense

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "total_investment": round(total_investment, 2),
        "account_balance": round(account_balance, 2),
        "net_pl": round(net_pl, 2),
    }


@api.get("/reports/monthly")
async def report_monthly(year: int = Query(...), _: dict = Depends(get_current_user)):
    """Returns monthly income & expense breakdown for given year."""
    months = {f"{year}-{m:02d}": {"month": f"{year}-{m:02d}", "income": 0.0, "expense": 0.0}
              for m in range(1, 13)}
    async for r in db.incomes.find({"date": {"$regex": f"^{year}-"}}, {"_id": 0, "date": 1, "amount": 1}):
        key = r["date"][:7]
        if key in months:
            months[key]["income"] += r["amount"]
    async for r in db.expenses.find({"date": {"$regex": f"^{year}-"}}, {"_id": 0, "date": 1, "amount": 1}):
        key = r["date"][:7]
        if key in months:
            months[key]["expense"] += r["amount"]
    return list(months.values())


@api.get("/reports/category-breakdown")
async def category_breakdown(
    type: Literal["income", "expense"] = Query(...),
    year: Optional[int] = None,
    month: Optional[int] = None,
    _: dict = Depends(get_current_user),
):
    coll = db.incomes if type == "income" else db.expenses
    q = {}
    if year and month:
        prefix = f"{year}-{month:02d}-"
        q["date"] = {"$regex": f"^{prefix}"}
    elif year:
        q["date"] = {"$regex": f"^{year}-"}
    out = {}
    async for r in coll.find(q, {"_id": 0, "category": 1, "amount": 1}):
        out[r["category"]] = out.get(r["category"], 0) + r["amount"]
    return [{"category": k, "amount": round(v, 2)} for k, v in sorted(out.items(), key=lambda x: -x[1])]


@api.get("/reports/partner-investments")
async def partner_investments(_: dict = Depends(get_current_user)):
    partners = await db.users.find(
        {"status": "approved"},
        {"_id": 0, "id": 1, "name": 1},
    ).to_list(500)
    investments = await db.investments.find({}, {"_id": 0}).to_list(5000)
    out = []
    for p in partners:
        items = [i for i in investments if i["partner_id"] == p["id"]]
        total = sum(i["amount"] for i in items)
        direct = sum(i["amount"] for i in items if i.get("source") == "direct")
        from_pocket = sum(i["amount"] for i in items if i.get("source") == "expense")
        out.append({
            "partner_id": p["id"],
            "partner_name": p["name"],
            "total": round(total, 2),
            "direct": round(direct, 2),
            "from_pocket": round(from_pocket, 2),
            "count": len(items),
        })
    out.sort(key=lambda x: -x["total"])
    return out


@api.get("/reports/transactions")
async def transactions(
    type: Optional[Literal["income", "expense", "investment"]] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    """Combined transactions list."""
    def in_range(d: str) -> bool:
        if start and d < start:
            return False
        if end and d > end:
            return False
        return True

    out = []
    pending_inc = await _pending_deletion_ids("income")
    pending_exp = await _pending_deletion_ids("expense")
    pending_inv = await _pending_deletion_ids("investment")
    if type in (None, "income"):
        async for r in db.incomes.find({}, {"_id": 0}):
            if in_range(r["date"]):
                out.append({**r, "kind": "income", "pending_deletion": r["id"] in pending_inc})
    if type in (None, "expense"):
        async for r in db.expenses.find({}, {"_id": 0}):
            if in_range(r["date"]):
                out.append({**r, "kind": "expense", "pending_deletion": r["id"] in pending_exp})
    if type in (None, "investment"):
        async for r in db.investments.find({}, {"_id": 0}):
            if in_range(r["date"]):
                out.append({**r, "kind": "investment", "pending_deletion": r["id"] in pending_inv})

    out.sort(key=lambda x: x["date"], reverse=True)
    return out


@api.get("/reports/breakdown")
async def report_breakdown(
    type: Literal["income", "expense", "investment"] = Query(...),
    _: dict = Depends(get_current_user),
):
    """Returns Monthly (current year), Yearly (last 5 yrs), and Total for income/expense/investment."""
    coll = {"income": db.incomes, "expense": db.expenses, "investment": db.investments}[type]
    rows = await coll.find({}, {"_id": 0, "date": 1, "amount": 1}).to_list(20000)

    now = datetime.now(timezone.utc)
    current_year = now.year

    monthly = {f"{current_year}-{m:02d}": 0.0 for m in range(1, 13)}
    yearly = {}
    total = 0.0
    for r in rows:
        amt = float(r.get("amount", 0) or 0)
        date = r.get("date", "") or ""
        total += amt
        if len(date) >= 7:
            ykey = date[:4]
            yearly[ykey] = yearly.get(ykey, 0.0) + amt
            if date.startswith(f"{current_year}-"):
                mkey = date[:7]
                if mkey in monthly:
                    monthly[mkey] += amt

    monthly_list = [
        {"month": k, "label": datetime(int(k[:4]), int(k[5:7]), 1).strftime("%b"), "amount": round(v, 2)}
        for k, v in sorted(monthly.items())
    ]
    yearly_list = [
        {"year": k, "amount": round(v, 2)}
        for k, v in sorted(yearly.items(), reverse=True)
    ][:6]
    return {
        "type": type,
        "current_year": current_year,
        "total": round(total, 2),
        "monthly": monthly_list,
        "yearly": yearly_list,
    }


# ---------------- Notes ----------------
@api.get("/notes/individual", response_model=Optional[Note])
async def get_individual_note(user: dict = Depends(get_current_user)):
    return await db.notes.find_one({"user_id": user["id"]}, {"_id": 0})


@api.post("/notes/individual", response_model=Note)
async def save_individual_note(payload: NoteIn, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    await db.notes.update_one(
        {"user_id": user["id"]},
        {
            "$set": {"content": payload.content, "updated_at": now},
            "$setOnInsert": {"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now}
        },
        upsert=True
    )
    return await db.notes.find_one({"user_id": user["id"]}, {"_id": 0})


@api.get("/notes/common", response_model=List[CommonNote])
async def list_common_notes(_: dict = Depends(get_current_user)):
    return await db.common_notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/notes/common", response_model=CommonNote)
async def create_common_note(payload: CommonNoteIn, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user["name"],
        "content": payload.content,
        "replies": [],
        "created_at": now,
        "updated_at": now
    }
    await db.common_notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/notes/common/{note_id}/reply", response_model=CommonNote)
async def reply_common_note(note_id: str, payload: ReplyIn, user: dict = Depends(get_current_user)):
    reply = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user["name"],
        "content": payload.content,
        "created_at": utc_now_iso()
    }
    res = await db.common_notes.find_one_and_update(
        {"id": note_id},
        {"$push": {"replies": reply}, "$set": {"updated_at": utc_now_iso()}},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Note not found")
    res.pop("_id", None)
    return res


# ---------------- Farm Updates ----------------
@api.get("/farm-updates", response_model=List[FarmUpdate])
async def list_farm_updates(
    skip: int = Query(0, ge=0),
    limit: int = Query(2, ge=1, le=50),
    _: dict = Depends(get_current_user)
):
    return await db.farm_updates.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)


@api.post("/farm-updates", response_model=FarmUpdate)
async def create_farm_update(payload: FarmUpdateIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "image": payload.image,
        "note": payload.note,
        "author_id": user["id"],
        "author_name": user["name"],
        "created_at": utc_now_iso()
    }
    await db.farm_updates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/")
async def root():
    return {"app": "Family Exponse", "status": "ok"}


# ---------------- Audits ----------------

@api.get("/audits")
async def list_audits(_: dict = Depends(get_current_user)):
    rows = await audit_db.audits.find({}, {"_id": 0}) \
        .sort("created_at", -1) \
        .to_list(5000)

    return rows

# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

