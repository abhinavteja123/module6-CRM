import hashlib
import os
import re
import secrets
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from threading import RLock
from typing import Any, Literal

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from supabase import Client, create_client

load_dotenv()

Role = Literal[
    "super_admin",
    "university_admin",
    "coordinator",
    "regional_manager",
    "placement_manager",
]
TEAM_ROLES = {"coordinator", "regional_manager", "placement_manager"}


class Settings(BaseSettings):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173")
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    bcrypt_rounds: int = int(os.getenv("BCRYPT_ROUNDS", "11"))
    profile_cache_ttl_seconds: float = float(os.getenv("PROFILE_CACHE_TTL_SECONDS", "15"))
    bootstrap_admin_email: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "")
    bootstrap_admin_password: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    bootstrap_admin_name: str = os.getenv("BOOTSTRAP_ADMIN_NAME", "Vextra AI Admin")


settings = Settings()
if not settings.supabase_url or not settings.supabase_service_role_key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
if not settings.jwt_secret or len(settings.jwt_secret) < 32:
    raise RuntimeError("JWT_SECRET must be configured with at least 32 characters")
if not 10 <= settings.bcrypt_rounds <= 14:
    raise RuntimeError("BCRYPT_ROUNDS must be between 10 and 14")
if settings.profile_cache_ttl_seconds < 1:
    raise RuntimeError("PROFILE_CACHE_TTL_SECONDS must be at least 1")

db: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
db_executor = ThreadPoolExecutor(max_workers=8)
bearer = HTTPBearer(auto_error=False)
profile_cache: dict[str, tuple[float, dict[str, Any]]] = {}
profile_cache_lock = RLock()
directory_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
directory_cache_lock = RLock()
DIRECTORY_CACHE_TTL_SECONDS = 5.0
PROFILE_COLUMNS = "id,full_name,email,role,status,created_at,password_hash,university_id,reports_to,must_change_password,last_login_at"
app = FastAPI(title="Vextra AI CRM API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        dict.fromkeys(
            [settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]
        )
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_KANBAN_STAGES = [
    {"name": "Prospecting", "color": "#64748b", "position": 0},
    {"name": "Meeting Scheduled", "color": "#2563eb", "position": 1},
    {"name": "Proposal Sent", "color": "#f59e0b", "position": 2},
    {"name": "Closed Won", "color": "#10b981", "position": 3},
    {"name": "Closed Lost", "color": "#ef4444", "position": 4},
]


def fail(message: str, code: int = 400, payload: dict[str, Any] | None = None):
    raise HTTPException(status_code=code, detail=payload or message)


def record_audit(
    actor: dict[str, Any] | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    university_id: str | None = None,
    summary: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> None:
    """Best-effort audit logging that never breaks the business operation."""
    try:
        db.table("audit_events").insert(
            {
                "actor_id": actor.get("id") if actor else None,
                "university_id": university_id or (actor.get("university_id") if actor else None),
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "summary": summary or {},
                "request_id": request_id,
            }
        ).execute()
    except Exception:
        pass


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    university_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    href: str | None = None,
) -> None:
    try:
        db.table("notifications").insert(
            {
                "user_id": user_id,
                "university_id": university_id,
                "type": notification_type,
                "title": title,
                "message": message,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "href": href,
            }
        ).execute()
    except Exception:
        pass


def notify_users(
    user_ids: list[str],
    notification_type: str,
    title: str,
    message: str,
    university_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    href: str | None = None,
) -> None:
    for user_id in dict.fromkeys(str(item) for item in user_ids):
        create_notification(user_id, notification_type, title, message, university_id, entity_type, entity_id, href)


def safe_contact_for_role(row: dict[str, Any], user: dict[str, Any], organization_name: str | None = None) -> dict[str, Any]:
    """Mask personal contact identity for university admins and supervisors."""
    if user.get("role") == "placement_manager":
        return {**row, **({"organization_name": organization_name} if organization_name else {})}
    return {
        "id": row.get("id"),
        "organization_id": row.get("organization_id"),
        "organization_name": organization_name or "Organization contact",
        "name": "Contact details protected",
        "designation": "Protected",
        "email": None,
        "phone": None,
        "linkedin_url": None,
        "notes": None,
        "created_at": row.get("created_at"),
    }


def safe_report_for_role(row: dict[str, Any], user: dict[str, Any], organization_name: str | None = None) -> dict[str, Any]:
    if user.get("role") == "placement_manager":
        return {**row, **({"organization_name": organization_name} if organization_name else {})}
    return {
        **row,
        "organization_name": organization_name or "Organization activity",
        "attendees": "Protected",
        "summary": "Report details are available to authorized university staff; personal contact details are protected.",
        "action_items": "Protected",
        "action_items_list": [],
    }


def now() -> datetime:
    return datetime.now(timezone.utc)


def password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=settings.bcrypt_rounds)).decode("utf-8")


def password_matches(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except ValueError:
        return False


def password_needs_rehash(stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        return int(stored_hash.split("$")[2]) > settings.bcrypt_rounds
    except (IndexError, ValueError):
        return True


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def safe_user(row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key != "password_hash"}


def cache_profile(profile: dict[str, Any]) -> None:
    expires_at = time.monotonic() + settings.profile_cache_ttl_seconds
    cached = dict(profile)
    with profile_cache_lock:
        profile_cache[f"id:{profile['id']}"] = (expires_at, cached)
        if profile.get("email"):
            profile_cache[f"email:{profile['email'].strip().lower()}"] = (expires_at, cached)


def cached_profile(key: str) -> dict[str, Any] | None:
    with profile_cache_lock:
        item = profile_cache.get(key)
        if not item:
            return None
        if item[0] <= time.monotonic():
            profile_cache.pop(key, None)
            return None
        return dict(item[1])


def invalidate_profile_cache(user_id: str, email: str | None = None) -> None:
    with profile_cache_lock:
        profile_cache.pop(f"id:{user_id}", None)
        if email:
            profile_cache.pop(f"email:{email.strip().lower()}", None)
        for key, (_, profile) in list(profile_cache.items()):
            if str(profile.get("id")) == str(user_id):
                profile_cache.pop(key, None)
    with directory_cache_lock:
        directory_cache.clear()


def get_profile(user_id: str) -> dict[str, Any] | None:
    cached = cached_profile(f"id:{user_id}")
    if cached:
        return cached
    rows = db.table("profiles").select(PROFILE_COLUMNS).eq("id", user_id).limit(1).execute().data or []
    if not rows:
        return None
    cache_profile(rows[0])
    return dict(rows[0])


def get_profile_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    cached = cached_profile(f"email:{normalized_email}")
    if cached:
        return cached
    rows = (
        db.table("profiles")
        .select(PROFILE_COLUMNS)
        .ilike("email", normalized_email)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return None
    cache_profile(rows[0])
    return dict(rows[0])


def issue_tokens(user: dict[str, Any]) -> dict[str, str]:
    issued = now()
    access_payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "type": "access",
        "iat": int(issued.timestamp()),
        "exp": int((issued + timedelta(minutes=settings.access_token_minutes)).timestamp()),
    }
    access_token = jwt.encode(access_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    refresh_token = secrets.token_urlsafe(48)
    db.table("auth_sessions").insert(
        {
            "user_id": str(user["id"]),
            "refresh_token_hash": hash_token(refresh_token),
            "expires_at": (issued + timedelta(days=settings.refresh_token_days)).isoformat(),
        }
    ).execute()
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


def persist_last_login(user_id: str, login_time: str) -> None:
    try:
        db.table("profiles").update({"last_login_at": login_time}).eq("id", user_id).execute()
    except Exception:
        pass


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, Any]:
    if not credentials:
        fail("Authentication required", status.HTTP_401_UNAUTHORIZED)
    try:
        decoded = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if decoded.get("type") != "access" or not decoded.get("sub"):
            raise ValueError("wrong token type")
    except (jwt.InvalidTokenError, ValueError):
        fail("Invalid or expired session", status.HTTP_401_UNAUTHORIZED)
    user = get_profile(str(decoded["sub"]))
    if not user or user.get("status") != "active":
        fail("Inactive or missing account", status.HTTP_403_FORBIDDEN)
    return user


def require_roles(*roles: str):
    def dependency(request: Request, user=Depends(current_user)):
        if user.get("role") not in roles:
            record_audit(
                user,
                "permission_denied",
                "route",
                request.url.path,
                user.get("university_id"),
                {"method": request.method, "required_roles": list(roles)},
                request.headers.get("x-request-id"),
            )
            fail("You do not have permission for this action", status.HTTP_403_FORBIDDEN)
        return user

    return dependency


def all_profiles_for_university(university_id: str | None) -> list[dict[str, Any]]:
    if not university_id:
        return []
    cache_key = str(university_id)
    with directory_cache_lock:
        cached = directory_cache.get(cache_key)
        if cached and cached[0] > time.monotonic():
            return [dict(item) for item in cached[1]]
        if cached:
            directory_cache.pop(cache_key, None)
    rows = (
        db.table("profiles")
        .select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at")
        .eq("university_id", university_id)
        .execute()
        .data
        or []
    )
    with directory_cache_lock:
        directory_cache[cache_key] = (time.monotonic() + DIRECTORY_CACHE_TTL_SECONDS, [dict(item) for item in rows])
    return rows


def team_ids(user: dict[str, Any]) -> list[str]:
    role = user.get("role")
    user_id = str(user["id"])
    if role == "super_admin":
        return []
    if role == "university_admin":
        return [str(item["id"]) for item in all_profiles_for_university(user.get("university_id"))]
    if role == "placement_manager":
        return [user_id]
    people = all_profiles_for_university(user.get("university_id"))
    by_parent: dict[str, list[str]] = {}
    for person in people:
        parent = str(person.get("reports_to")) if person.get("reports_to") else ""
        by_parent.setdefault(parent, []).append(str(person["id"]))
    found = {user_id}
    pending = [user_id]
    while pending:
        parent = pending.pop()
        for child in by_parent.get(parent, []):
            if child not in found:
                found.add(child)
                pending.append(child)
    return list(found)


def scoped_rows(table: str, user: dict[str, Any], row_id: str | None = None):
    ids = team_ids(user)
    if not ids:
        fail("This account cannot access placement records", status.HTTP_403_FORBIDDEN)
    query = db.table(table).select("*").in_("placement_manager_id", ids)
    if row_id:
        query = query.eq("id", row_id)
    return query


def require_owned_or_team(table: str, row_id: str, user: dict[str, Any]) -> dict[str, Any]:
    rows = scoped_rows(table, user, row_id).execute().data or []
    if not rows:
        fail("Record not found", status.HTTP_404_NOT_FOUND)
    return rows[0]


def can_manage_target(actor: dict[str, Any], target_role: str) -> bool:
    role = actor.get("role")
    if role == "super_admin":
        return target_role == "university_admin"
    if role == "university_admin":
        return target_role in {"coordinator", "regional_manager", "placement_manager"}
    if role == "coordinator":
        return target_role in {"regional_manager", "placement_manager"}
    return False


def ensure_bootstrap_admin():
    if not settings.bootstrap_admin_email or not settings.bootstrap_admin_password:
        return
    existing = db.table("profiles").select("id").eq("role", "super_admin").limit(1).execute().data or []
    if existing:
        matching = get_profile_by_email(settings.bootstrap_admin_email) or get_profile(str(existing[0]["id"]))
        if matching and not matching.get("password_hash"):
            db.table("profiles").update({"email": settings.bootstrap_admin_email.strip().lower(), "full_name": settings.bootstrap_admin_name, "password_hash": password_hash(settings.bootstrap_admin_password)}).eq("id", matching["id"]).execute()
        return
    db.table("profiles").insert(
        {
            "id": str(uuid.uuid4()),
            "full_name": settings.bootstrap_admin_name,
            "email": settings.bootstrap_admin_email.strip().lower(),
            "role": "super_admin",
            "status": "active",
            "password_hash": password_hash(settings.bootstrap_admin_password),
        }
    ).execute()


@app.on_event("startup")
def startup():
    ensure_bootstrap_admin()


class LoginIn(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=20)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class PasswordResetRequestIn(BaseModel):
    email: str = Field(min_length=3)


class OrganizationIn(BaseModel):
    name: str = Field(min_length=1)
    expected_ctc: str | None = Field(default=None, min_length=1)
    industry: str = Field(min_length=1)
    website: str = Field(min_length=1)
    city: str = Field(min_length=1)
    status: Literal["prospect", "active", "inactive"]
    notes: str = Field(min_length=1)
    allow_duplicate: bool = False


class OrganizationUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    expected_ctc: str | None = Field(default=None, min_length=1)
    industry: str | None = Field(default=None, min_length=1)
    website: str | None = Field(default=None, min_length=1)
    city: str | None = Field(default=None, min_length=1)
    status: Literal["prospect", "active", "inactive"] | None = None
    notes: str | None = Field(default=None, min_length=1)


class ContactIn(BaseModel):
    organization_id: str
    name: str = Field(min_length=1)
    designation: str = Field(min_length=1)
    email: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    linkedin_url: str = Field(min_length=1)
    notes: str = Field(min_length=1)


class ContactUpdateIn(BaseModel):
    organization_id: str | None = None
    name: str | None = Field(default=None, min_length=1)
    designation: str | None = Field(default=None, min_length=1)
    email: str | None = Field(default=None, min_length=1)
    phone: str | None = Field(default=None, min_length=1)
    linkedin_url: str | None = Field(default=None, min_length=1)
    notes: str | None = Field(default=None, min_length=1)


class ReportIn(BaseModel):
    organization_id: str
    contact_id: str
    meeting_date: date
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    action_items: str = Field(min_length=1)
    attendees: str = Field(min_length=1)
    outcome: str = Field(min_length=1)
    follow_up_date: date
    meeting_type: str = Field(min_length=1)


class StageIn(BaseModel):
    name: str = Field(min_length=1)
    position: int = 0
    color: str = "#6b7280"
    wip_limit: int | None = Field(default=None, gt=0)


class CardIn(BaseModel):
    stage_id: str
    organization_id: str
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: str = Field(min_length=1)
    due_date: date
    position: int = 0


class CardUpdate(BaseModel):
    stage_id: str | None = None
    organization_id: str | None = None
    title: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    priority: str | None = Field(default=None, min_length=1)
    due_date: date | None = None
    position: int | None = None


class StageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    position: int | None = None
    color: str | None = None
    wip_limit: int | None = Field(default=None, gt=0)


class ActionItemUpdate(BaseModel):
    is_completed: bool


class UniversityIn(BaseModel):
    name: str = Field(min_length=2)
    code: str | None = None
    city: str = Field(min_length=1)


class UserIn(BaseModel):
    email: str = Field(min_length=3)
    full_name: str = Field(min_length=1)
    password: str = Field(min_length=8)
    role: Role
    university_id: str | None = None


class UserStatusIn(BaseModel):
    status: Literal["active", "inactive"]


class TeamUserUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    email: str | None = Field(default=None, min_length=3)
    password: str | None = Field(default=None, min_length=8)
    status: Literal["active", "inactive"] | None = None


@app.get("/health")
def health():
    return {"ok": True, "service": "vextra-ai-crm-api", "auth": "application-jwt", "database": "supabase"}


@app.post("/api/auth/login")
def login(payload: LoginIn, background_tasks: BackgroundTasks, request: Request):
    user = get_profile_by_email(payload.email)
    if not user or user.get("status") != "active" or not password_matches(payload.password, user.get("password_hash")):
        fail("Invalid email or password", status.HTTP_401_UNAUTHORIZED)
    if password_needs_rehash(user.get("password_hash")):
        new_hash = password_hash(payload.password)
        db.table("profiles").update({"password_hash": new_hash}).eq("id", user["id"]).execute()
        user["password_hash"] = new_hash
    login_time = now().isoformat()
    user["last_login_at"] = login_time
    cache_profile(user)
    background_tasks.add_task(persist_last_login, str(user["id"]), login_time)
    tokens = issue_tokens(user)
    background_tasks.add_task(record_audit, user, "login", "account", str(user["id"]), request_id=request.headers.get("x-request-id"))
    return {"user": safe_user(user), "profile": safe_user(user), **tokens}


@app.post("/api/auth/refresh")
def refresh(payload: RefreshIn):
    sessions = (
        db.table("auth_sessions")
        .select("*")
        .eq("refresh_token_hash", hash_token(payload.refresh_token))
        .is_("revoked_at", "null")
        .limit(1)
        .execute()
        .data
        or []
    )
    if not sessions:
        fail("Invalid or expired refresh token", status.HTTP_401_UNAUTHORIZED)
    expires = datetime.fromisoformat(sessions[0]["expires_at"].replace("Z", "+00:00"))
    if expires <= now():
        fail("Invalid or expired refresh token", status.HTTP_401_UNAUTHORIZED)
    user = get_profile(str(sessions[0]["user_id"]))
    if not user or user.get("status") != "active":
        fail("Inactive or missing account", status.HTTP_401_UNAUTHORIZED)
    db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("id", sessions[0]["id"]).execute()
    return {"user": safe_user(user), "profile": safe_user(user), **issue_tokens(user)}


@app.post("/api/auth/logout")
def logout(request: Request, payload: RefreshIn | None = None, user=Depends(current_user)):
    query = db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user["id"]).is_("revoked_at", "null")
    if payload and payload.refresh_token:
        query = query.eq("refresh_token_hash", hash_token(payload.refresh_token))
    query.execute()
    record_audit(user, "logout", "account", str(user["id"]), request_id=request.headers.get("x-request-id") if request else None)
    return {"ok": True}


@app.get("/api/me")
def me(user=Depends(current_user)):
    return safe_user(user)


def refresh_due_notifications(user: dict[str, Any]) -> None:
    """Create idempotent in-app reminders for the current user's owned CRM records."""
    if user.get("role") != "placement_manager":
        return
    today = date.today().isoformat()
    reports = db.table("meeting_reports").select("id,title,follow_up_date").eq("placement_manager_id", user["id"]).lte("follow_up_date", today).execute().data or []
    cards = db.table("kanban_cards").select("id,title,due_date,stage_id,completed_at").eq("placement_manager_id", user["id"]).lte("due_date", today).is_("completed_at", "null").execute().data or []
    stage_ids = list({str(card["stage_id"]) for card in cards if card.get("stage_id")})
    stages = db.table("kanban_stages").select("id,name").in_("id", stage_ids).execute().data if stage_ids else []
    closed_stage_ids = {
        str(stage["id"])
        for stage in (stages or [])
        if str(stage.get("name", "")).strip().lower() in {"closed won", "closed lost", "done", "completed"}
    }
    cards = [card for card in cards if str(card.get("stage_id")) not in closed_stage_ids]
    for report in reports:
        existing = db.table("notifications").select("id").eq("user_id", user["id"]).eq("entity_type", "meeting_report").eq("entity_id", report["id"]).eq("type", "overdue_follow_up").gte("created_at", f"{today}T00:00:00+00:00").limit(1).execute().data or []
        if not existing:
            create_notification(str(user["id"]), "overdue_follow_up", "Follow-up overdue", f"Follow up on {report.get('title') or 'your meeting report'}.", user.get("university_id"), "meeting_report", report["id"], "Meeting Reports")
    for card in cards:
        existing = db.table("notifications").select("id").eq("user_id", user["id"]).eq("entity_type", "kanban_card").eq("entity_id", card["id"]).eq("type", "card_due").gte("created_at", f"{today}T00:00:00+00:00").limit(1).execute().data or []
        if not existing:
            create_notification(str(user["id"]), "card_due", "Pipeline card due", f"Review {card.get('title') or 'your pipeline card'}.", user.get("university_id"), "kanban_card", card["id"], "Kanban")


@app.get("/api/notifications")
def list_notifications(background_tasks: BackgroundTasks, limit: int = Query(default=30, ge=1, le=100), user=Depends(current_user)):
    background_tasks.add_task(refresh_due_notifications, user)
    return db.table("notifications").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(limit).execute().data or []


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user=Depends(current_user)):
    result = db.table("notifications").update({"is_read": True, "read_at": now().isoformat()}).eq("id", notification_id).eq("user_id", user["id"]).execute()
    if not result.data:
        fail("Notification not found", 404)
    return result.data[0]


@app.post("/api/notifications/read-all")
def mark_all_notifications_read(user=Depends(current_user)):
    db.table("notifications").update({"is_read": True, "read_at": now().isoformat()}).eq("user_id", user["id"]).eq("is_read", False).execute()
    return {"ok": True}


@app.get("/api/audit")
def list_audit_events(limit: int = Query(default=50, ge=1, le=200), user=Depends(current_user)):
    query = db.table("audit_events").select("*").order("created_at", desc=True).limit(limit)
    if user.get("role") == "super_admin":
        query = query.in_("entity_type", ["account", "university", "route"])
    elif user.get("role") == "university_admin":
        query = query.eq("university_id", user.get("university_id"))
    else:
        query = query.in_("actor_id", team_ids(user))
    events = query.execute().data or []
    if user.get("role") in {"coordinator", "regional_manager"}:
        return [{**event, "summary": {"activity": "Protected team activity"}} for event in events]
    return events


@app.post("/api/auth/change-password")
def change_password(payload: PasswordChangeIn, user=Depends(current_user)):
    if not password_matches(payload.current_password, user.get("password_hash")):
        fail("Current password is incorrect")
    new_hash = password_hash(payload.new_password)
    db.table("profiles").update({"password_hash": new_hash, "must_change_password": False}).eq("id", user["id"]).execute()
    invalidate_profile_cache(str(user["id"]), user.get("email"))
    db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user["id"]).is_("revoked_at", "null").execute()
    record_audit(user, "password_changed", "account", str(user["id"]), summary={"must_change_password": False})
    create_notification(str(user["id"]), "password_changed", "Password changed", "Your password was changed successfully.", user.get("university_id"), "account", str(user["id"]))
    return {"ok": True, "message": "Password changed. Please sign in again."}


@app.post("/api/auth/password-reset-request")
def password_reset_request(payload: PasswordResetRequestIn):
    user = get_profile_by_email(payload.email)
    if user:
        raw_token = secrets.token_urlsafe(32)
        db.table("password_reset_requests").insert({"user_id": user["id"], "token_hash": hash_token(raw_token), "expires_at": (now() + timedelta(minutes=30)).isoformat()}).execute()
    return {"ok": True, "message": "If the account exists, a password reset request has been recorded. Contact your university administrator for verification."}


@app.get("/api/organizations")
def list_organizations(user=Depends(require_roles("placement_manager", "university_admin"))):
    organizations = scoped_rows("organizations", user).order("created_at", desc=True).execute().data or []
    if user.get("role") == "university_admin":
        owners = profile_list_for_user_ids([str(item.get("placement_manager_id")) for item in organizations if item.get("placement_manager_id")])
        owner_names = {str(item["id"]): item["full_name"] for item in owners}
        return [{**item, "owner_name": owner_names.get(str(item.get("placement_manager_id")), "Team member")} for item in organizations]
    return organizations


@app.get("/api/organizations/check-duplicate")
def check_duplicate(name: str = Query(min_length=1), user=Depends(require_roles("placement_manager"))):
    query = db.table("organizations").select("id", count="exact").ilike("name", name.strip())
    if user.get("university_id"):
        query = query.eq("university_id", user["university_id"])
    result = query.execute()
    count = result.count or 0
    return {"exists": count > 0, "count": count}


@app.post("/api/organizations", status_code=201)
def create_organization(payload: OrganizationIn, user=Depends(require_roles("placement_manager"))):
    duplicate = check_duplicate(payload.name, user)
    if duplicate["exists"] and not payload.allow_duplicate:
        fail("This organization already exists in your university.", status.HTTP_409_CONFLICT, {"code": "duplicate_organization", "message": "This organization already exists in your university. Coordinate before adding another record."})
    data = payload.model_dump(exclude={"allow_duplicate"})
    data.update({"placement_manager_id": user["id"], "university_id": user.get("university_id")})
    created = db.table("organizations").insert(data).execute().data[0]
    record_audit(user, "created", "organization", created.get("id"), user.get("university_id"), {"name": created.get("name"), "status": created.get("status")})
    return created


@app.patch("/api/organizations/{item_id}")
def update_organization(item_id: str, payload: OrganizationUpdateIn, user=Depends(require_roles("placement_manager"))):
    current = scoped_rows("organizations", user, item_id).execute().data or []
    if not current:
        fail("Organization not found", 404)
    updates = {key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if not updates:
        fail("No organization changes supplied")
    result = db.table("organizations").update({**updates, "updated_at": now().isoformat()}).eq("id", item_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Organization not found", 404)
    record_audit(user, "updated", "organization", item_id, user.get("university_id"), {"fields": list(updates.keys()), "status": result.data[0].get("status")})
    return result.data[0]


@app.delete("/api/organizations/{item_id}")
def delete_organization(item_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("organizations").delete().eq("id", item_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Organization not found", 404)
    record_audit(user, "deleted", "organization", item_id, user.get("university_id"), {"name": result.data[0].get("name") if result.data else None})
    return {"ok": True}


@app.get("/api/contacts")
def list_contacts(user=Depends(require_roles("placement_manager", "university_admin"))):
    contacts = scoped_rows("contacts", user).order("created_at", desc=True).execute().data or []
    if user.get("role") == "university_admin":
        org_ids = list({str(item.get("organization_id")) for item in contacts if item.get("organization_id")})
        organizations = db.table("organizations").select("id,name").in_("id", org_ids).execute().data if org_ids else []
        org_names = {str(item["id"]): item["name"] for item in (organizations or [])}
        return [safe_contact_for_role(item, user, org_names.get(str(item.get("organization_id")))) for item in contacts]
    return contacts


@app.post("/api/contacts", status_code=201)
def create_contact(payload: ContactIn, user=Depends(require_roles("placement_manager"))):
    if not scoped_rows("organizations", user, payload.organization_id).execute().data:
        fail("Organization does not belong to the current manager", 403)
    created = db.table("contacts").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]
    record_audit(user, "created", "contact", created.get("id"), user.get("university_id"), {"organization_id": created.get("organization_id")})
    return created


@app.patch("/api/contacts/{contact_id}")
def update_contact(contact_id: str, payload: ContactUpdateIn, user=Depends(require_roles("placement_manager"))):
    current = scoped_rows("contacts", user, contact_id).execute().data or []
    if not current:
        fail("Contact not found", 404)
    updates = {key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if "organization_id" in updates and not scoped_rows("organizations", user, updates["organization_id"]).execute().data:
        fail("Organization does not belong to the current manager", 403)
    if not updates:
        fail("No contact changes supplied")
    result = db.table("contacts").update(updates).eq("id", contact_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Contact not found", 404)
    record_audit(user, "updated", "contact", contact_id, user.get("university_id"), {"fields": list(updates.keys()), "organization_id": result.data[0].get("organization_id")})
    return result.data[0]


@app.get("/api/meeting-reports")
def list_reports(user=Depends(require_roles("placement_manager", "university_admin"))):
    reports = scoped_rows("meeting_reports", user).order("meeting_date", desc=True).execute().data or []
    ids = team_ids(user)
    actions = db.table("meeting_action_items").select("*").in_("placement_manager_id", ids).order("position").execute().data or []
    by_report: dict[str, list[dict[str, Any]]] = {}
    for action in actions:
        by_report.setdefault(action["meeting_report_id"], []).append(action)
    for report in reports:
        report["action_items_list"] = by_report.get(report["id"], [])
    if user.get("role") == "university_admin":
        org_ids = list({str(item.get("organization_id")) for item in reports if item.get("organization_id")})
        organizations = db.table("organizations").select("id,name").in_("id", org_ids).execute().data if org_ids else []
        org_names = {str(item["id"]): item["name"] for item in (organizations or [])}
        return [safe_report_for_role(item, user, org_names.get(str(item.get("organization_id")))) for item in reports]
    return reports


@app.get("/api/search")
def global_search(
    q: str = Query(default="", max_length=120),
    types: str = Query(default="accounts,universities,organizations,contacts,reports"),
    role: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    university_id: str | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    cursor: int = Query(default=0, ge=0),
    user=Depends(current_user),
):
    """Search only records the authenticated role is allowed to discover."""
    term = re.sub(r"[^\w@.\- ]", "", q.strip(), flags=re.UNICODE).lower()
    requested = {item.strip() for item in types.split(",") if item.strip()}
    results: list[dict[str, Any]] = []
    university_rows: list[dict[str, Any]] = []
    scoped_ids = [str(item) for item in team_ids(user)] if user.get("role") != "super_admin" else []

    def matches(*values: Any) -> bool:
        if not term:
            return True
        return term in " ".join(str(value or "") for value in values).lower()

    def result(kind: str, item_id: Any, title: str, subtitle: str = "", meta: dict[str, Any] | None = None, href: str | None = None):
        results.append({"type": kind, "id": str(item_id), "title": title, "subtitle": subtitle, "meta": meta or {}, "href": href})

    if "accounts" in requested:
        query = db.table("profiles").select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at,must_change_password")
        if user.get("role") != "super_admin":
            if not scoped_ids:
                query = query.eq("id", "00000000-0000-0000-0000-000000000000")
            else:
                query = query.in_("id", scoped_ids)
        if role:
            query = query.eq("role", role)
        if status_filter:
            query = query.eq("status", status_filter)
        if university_id:
            query = query.eq("university_id", university_id)
        people_future = db_executor.submit(lambda: query.order("created_at", desc=True).limit(500).execute().data or [])
        universities_future = db_executor.submit(lambda: db.table("universities").select("id,name,code,city,status").limit(500).execute().data or [])
        people = people_future.result()
        university_rows = universities_future.result()
        university_names = {str(item["id"]): item["name"] for item in university_rows}
        names = {str(item["id"]): item["full_name"] for item in people}
        for person in people:
            if matches(person.get("full_name"), person.get("email"), person.get("role"), university_names.get(str(person.get("university_id"))), names.get(str(person.get("reports_to")))):
                result("account", person["id"], person["full_name"], person.get("email", ""), {"role": person.get("role"), "status": person.get("status"), "university": university_names.get(str(person.get("university_id"))), "last_login_at": person.get("last_login_at"), "must_change_password": person.get("must_change_password")}, "Users")

    if "universities" in requested and user.get("role") == "super_admin":
        universities = university_rows or db.table("universities").select("id,name,code,city,status").order("created_at", desc=True).limit(500).execute().data or []
        for university in universities:
            if matches(university.get("name"), university.get("code"), university.get("city"), university.get("status")):
                result("university", university["id"], university["name"], university.get("city") or "", {"code": university.get("code"), "status": university.get("status")}, "Universities")

    can_read_crm = user.get("role") in {"placement_manager", "university_admin", "coordinator", "regional_manager"}
    if can_read_crm and "organizations" in requested:
        org_query = db.table("organizations").select("*")
        if user.get("role") == "placement_manager":
            org_query = org_query.eq("placement_manager_id", user["id"])
        elif scoped_ids:
            org_query = org_query.in_("placement_manager_id", scoped_ids)
        if university_id:
            org_query = org_query.eq("university_id", university_id)
        organizations = org_query.order("created_at", desc=True).limit(500).execute().data or []
        people = profile_list_for_user_ids([str(row.get("placement_manager_id")) for row in organizations if row.get("placement_manager_id")])
        owner_names = {str(item["id"]): item["full_name"] for item in people}
        for organization in organizations:
            if not matches(organization.get("name"), organization.get("industry"), organization.get("city"), organization.get("status"), owner_names.get(str(organization.get("placement_manager_id")))):
                continue
            if user.get("role") in {"coordinator", "regional_manager"}:
                result("organization", organization["id"], "Organization activity", f"{organization.get('status', 'active')} · {owner_names.get(str(organization.get('placement_manager_id')), 'Team member')}", {"masked": True, "status": organization.get("status")}, "Organizations")
            else:
                result("organization", organization["id"], organization.get("name", "Organization"), owner_names.get(str(organization.get("placement_manager_id")), ""), {"industry": organization.get("industry"), "city": organization.get("city"), "status": organization.get("status"), "masked": False}, "Organizations")

    if can_read_crm and "contacts" in requested and user.get("role") in {"placement_manager", "university_admin"}:
        contact_query = db.table("contacts").select("*")
        if user.get("role") == "placement_manager":
            contact_query = contact_query.eq("placement_manager_id", user["id"])
        elif scoped_ids:
            contact_query = contact_query.in_("placement_manager_id", scoped_ids)
        contacts = contact_query.order("created_at", desc=True).limit(500).execute().data or []
        org_ids = list({str(item.get("organization_id")) for item in contacts if item.get("organization_id")})
        org_rows = db.table("organizations").select("id,name").in_("id", org_ids).execute().data if org_ids else []
        org_names = {str(item["id"]): item["name"] for item in (org_rows or [])}
        for contact in contacts:
            organization_name = org_names.get(str(contact.get("organization_id")), "Organization")
            if user.get("role") == "university_admin":
                if not matches(organization_name):
                    continue
                result("contact", contact["id"], "Contact details protected", organization_name, {"masked": True}, "Contacts")
            elif matches(contact.get("name"), contact.get("email"), contact.get("phone"), contact.get("designation"), organization_name):
                result("contact", contact["id"], contact.get("name", "Contact"), organization_name, {"designation": contact.get("designation"), "masked": False}, "Contacts")

    if can_read_crm and "reports" in requested:
        report_query = db.table("meeting_reports").select("id,title,meeting_date,outcome,follow_up_date,organization_id,placement_manager_id")
        if user.get("role") == "placement_manager":
            report_query = report_query.eq("placement_manager_id", user["id"])
        elif scoped_ids:
            report_query = report_query.in_("placement_manager_id", scoped_ids)
        reports = report_query.order("meeting_date", desc=True).limit(500).execute().data or []
        org_ids = list({str(item.get("organization_id")) for item in reports if item.get("organization_id")})
        org_rows = db.table("organizations").select("id,name").in_("id", org_ids).execute().data if org_ids else []
        org_names = {str(item["id"]): item["name"] for item in (org_rows or [])}
        for report in reports:
            organization_name = org_names.get(str(report.get("organization_id")), "Organization activity")
            if not matches(report.get("title"), report.get("meeting_date"), report.get("outcome"), organization_name):
                continue
            if user.get("role") in {"coordinator", "regional_manager"}:
                result("report", report["id"], "Report activity", "Protected team activity", {"meeting_date": report.get("meeting_date"), "outcome": report.get("outcome"), "follow_up_date": report.get("follow_up_date"), "masked": True}, "Team")
            else:
                result("report", report["id"], report.get("title") or "Meeting report", organization_name, {"meeting_date": report.get("meeting_date"), "outcome": report.get("outcome"), "follow_up_date": report.get("follow_up_date"), "masked": user.get("role") != "placement_manager"}, "Meeting Reports")

    results = results[cursor:cursor + limit]
    next_cursor = cursor + limit if len(results) == limit else None
    return {"results": results, "next_cursor": next_cursor}


@app.post("/api/meeting-reports", status_code=201)
def create_report(payload: ReportIn, user=Depends(require_roles("placement_manager"))):
    data = payload.model_dump(mode="json")
    if not scoped_rows("organizations", user, data["organization_id"]).execute().data or not scoped_rows("contacts", user, data["contact_id"]).execute().data:
        fail("Linked organization or contact does not belong to the current manager", 403)
    item_texts = [line.strip() for line in data.pop("action_items").splitlines() if line.strip()]
    report = db.table("meeting_reports").insert({**data, "action_items": "\n".join(item_texts), "placement_manager_id": user["id"]}).execute().data[0]
    items = [{"meeting_report_id": report["id"], "placement_manager_id": user["id"], "text": text, "position": index} for index, text in enumerate(item_texts)]
    report["action_items_list"] = db.table("meeting_action_items").insert(items).execute().data if items else []
    record_audit(user, "created", "meeting_report", report.get("id"), user.get("university_id"), {"title": report.get("title"), "organization_id": report.get("organization_id")})
    create_notification(str(user["id"]), "report_created", "Meeting report saved", f"{report.get('title') or 'Meeting report'} was added.", user.get("university_id"), "meeting_report", report.get("id"), "Meeting Reports")
    return report


@app.patch("/api/meeting-reports/{report_id}")
def update_report(report_id: str, payload: ReportIn, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("meeting_reports", report_id, user)
    data = payload.model_dump(mode="json")
    if not scoped_rows("organizations", user, data["organization_id"]).execute().data or not scoped_rows("contacts", user, data["contact_id"]).execute().data:
        fail("Linked organization or contact does not belong to the current manager", 403)
    item_texts = [line.strip() for line in data.pop("action_items").splitlines() if line.strip()]
    report = db.table("meeting_reports").update({**data, "action_items": "\n".join(item_texts)}).eq("id", report_id).eq("placement_manager_id", user["id"]).execute().data[0]
    db.table("meeting_action_items").delete().eq("meeting_report_id", report_id).eq("placement_manager_id", user["id"]).execute()
    items = [{"meeting_report_id": report_id, "placement_manager_id": user["id"], "text": text, "position": index} for index, text in enumerate(item_texts)]
    report["action_items_list"] = db.table("meeting_action_items").insert(items).execute().data if items else []
    record_audit(user, "updated", "meeting_report", report_id, user.get("university_id"), {"title": report.get("title"), "organization_id": report.get("organization_id")})
    return report


@app.delete("/api/meeting-reports/{report_id}")
def delete_report(report_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("meeting_reports").delete().eq("id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Meeting report not found", 404)
    record_audit(user, "deleted", "meeting_report", report_id, user.get("university_id"))
    return {"ok": True}


@app.patch("/api/meeting-reports/{report_id}/actions/{action_id}")
def update_action_item(report_id: str, action_id: str, payload: ActionItemUpdate, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("meeting_reports", report_id, user)
    result = db.table("meeting_action_items").update({"is_completed": payload.is_completed}).eq("id", action_id).eq("meeting_report_id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Action item not found", 404)
    record_audit(user, "updated", "meeting_action_item", action_id, user.get("university_id"), {"meeting_report_id": report_id, "is_completed": payload.is_completed})
    return result.data[0]


@app.get("/api/kanban")
def kanban(user=Depends(require_roles("placement_manager"))):
    stages = scoped_rows("kanban_stages", user).order("position").execute().data or []
    if not stages:
        stages = db.table("kanban_stages").insert([{**stage, "placement_manager_id": user["id"]} for stage in DEFAULT_KANBAN_STAGES]).execute().data or []
    cards = scoped_rows("kanban_cards", user).order("position").execute().data or []
    return {"stages": stages, "cards": cards}


@app.post("/api/kanban/stages", status_code=201)
def create_stage(payload: StageIn, user=Depends(require_roles("placement_manager"))):
    created = db.table("kanban_stages").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]
    record_audit(user, "created", "kanban_stage", created.get("id"), user.get("university_id"), {"name": created.get("name")})
    return created


@app.patch("/api/kanban/stages/{stage_id}")
def update_stage(stage_id: str, payload: StageUpdate, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("kanban_stages", stage_id, user)
    update = payload.model_dump(exclude_unset=True)
    if not update:
        fail("No stage changes supplied")
    updated = db.table("kanban_stages").update(update).eq("id", stage_id).eq("placement_manager_id", user["id"]).execute().data[0]
    record_audit(user, "updated", "kanban_stage", stage_id, user.get("university_id"), {"name": updated.get("name")})
    return updated


@app.delete("/api/kanban/stages/{stage_id}")
def delete_stage(stage_id: str, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("kanban_stages", stage_id, user)
    if scoped_rows("kanban_cards", user).eq("stage_id", stage_id).execute().data:
        fail("Move or delete the cards in this stage before deleting it", 409)
    result = db.table("kanban_stages").delete().eq("id", stage_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Stage not found", 404)
    record_audit(user, "deleted", "kanban_stage", stage_id, user.get("university_id"))
    return {"ok": True}


@app.post("/api/kanban/cards", status_code=201)
def create_card(payload: CardIn, user=Depends(require_roles("placement_manager"))):
    stage = scoped_rows("kanban_stages", user, payload.stage_id).execute().data
    if not stage or not scoped_rows("organizations", user, payload.organization_id).execute().data:
        fail("Stage or organization does not belong to the current manager", 403)
    stage_row = stage[0]
    if stage_row.get("wip_limit") is not None:
        current = scoped_rows("kanban_cards", user).eq("stage_id", payload.stage_id).execute().data or []
        if len(current) >= stage_row["wip_limit"]:
            fail(f"WIP limit reached for {stage_row['name']}", 409)
    last = scoped_rows("kanban_cards", user).eq("stage_id", payload.stage_id).order("position", desc=True).limit(1).execute().data or []
    data = payload.model_dump(mode="json")
    data["position"] = (last[0]["position"] + 1) if last else 0
    created = db.table("kanban_cards").insert({**data, "placement_manager_id": user["id"]}).execute().data[0]
    record_audit(user, "created", "kanban_card", created.get("id"), user.get("university_id"), {"title": created.get("title"), "stage_id": created.get("stage_id")})
    return created


@app.patch("/api/kanban/cards/{card_id}")
def update_card(card_id: str, payload: CardUpdate, user=Depends(require_roles("placement_manager"))):
    current = require_owned_or_team("kanban_cards", card_id, user)
    update = {key: value for key, value in payload.model_dump(mode="json").items() if value is not None}
    target_stage_id = update.get("stage_id", current["stage_id"])
    target_stage = scoped_rows("kanban_stages", user, target_stage_id).execute().data
    if not target_stage:
        fail("Stage does not belong to the current manager", 403)
    if "organization_id" in update and not scoped_rows("organizations", user, update["organization_id"]).execute().data:
        fail("Organization does not belong to the current manager", 403)
    if target_stage_id != current["stage_id"] and target_stage[0].get("wip_limit") is not None:
        cards_in_target = scoped_rows("kanban_cards", user).eq("stage_id", target_stage_id).execute().data or []
        if len(cards_in_target) >= target_stage[0]["wip_limit"]:
            fail(f"WIP limit reached for {target_stage[0]['name']}", 409)
        if "position" not in update:
            last = scoped_rows("kanban_cards", user).eq("stage_id", target_stage_id).order("position", desc=True).limit(1).execute().data or []
            update["position"] = (last[0]["position"] + 1) if last else 0
    update["updated_at"] = now().isoformat()
    update["completed_at"] = now().isoformat() if target_stage[0]["name"].lower() in {"closed won", "done", "completed"} else None
    updated = db.table("kanban_cards").update(update).eq("id", card_id).eq("placement_manager_id", user["id"]).execute().data[0]
    record_audit(user, "updated", "kanban_card", card_id, user.get("university_id"), {"title": updated.get("title"), "stage_id": updated.get("stage_id")})
    return updated


@app.delete("/api/kanban/cards/{card_id}")
def delete_card(card_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("kanban_cards").delete().eq("id", card_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Card not found", 404)
    record_audit(user, "deleted", "kanban_card", card_id, user.get("university_id"))
    return {"ok": True}


def profile_list_for_user_ids(ids: list[str]) -> list[dict[str, Any]]:
    if not ids:
        return []
    return db.table("profiles").select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at").in_("id", ids).order("created_at", desc=True).execute().data or []


def add_report_names(people: list[dict[str, Any]], university_id: str | None) -> list[dict[str, Any]]:
    if not people or not university_id:
        return people
    directory = all_profiles_for_university(university_id)
    names = {str(person["id"]): person["full_name"] for person in directory}
    return [
        {
            **person,
            "reports_to_name": names.get(str(person["reports_to"])) if person.get("reports_to") else None,
        }
        for person in people
    ]


def team_summary(user: dict[str, Any]) -> dict[str, Any]:
    ids = team_ids(user)
    summary_ids = [user_id for user_id in ids if str(user_id) != str(user["id"])]
    people = add_report_names(profile_list_for_user_ids(summary_ids), user.get("university_id"))
    if user.get("role") == "university_admin":
        people = [person for person in people if person.get("role") != "university_admin"]
    orgs = db.table("organizations").select("id,placement_manager_id,name").in_("placement_manager_id", summary_ids).execute().data if summary_ids else []
    contacts = db.table("contacts").select("id,placement_manager_id,organization_id,name,email,phone").in_("placement_manager_id", summary_ids).execute().data if summary_ids else []
    reports = db.table("meeting_reports").select("id,placement_manager_id,meeting_date,follow_up_date").in_("placement_manager_id", summary_ids).execute().data if summary_ids else []
    action_items = db.table("meeting_action_items").select("id,placement_manager_id,is_completed").in_("placement_manager_id", summary_ids).eq("is_completed", False).execute().data if summary_ids else []
    cards = db.table("kanban_cards").select("id,placement_manager_id,stage_id").in_("placement_manager_id", summary_ids).execute().data if summary_ids else []
    masked = user.get("role") in {"coordinator", "regional_manager"}
    today = date.today()
    recent_cutoff = today - timedelta(days=30)
    summaries = []
    for person in people:
        person_id = str(person["id"])
        person_reports = [report for report in reports if str(report["placement_manager_id"]) == person_id]
        person_actions = [item for item in action_items if str(item["placement_manager_id"]) == person_id]
        report_dates = [str(report["meeting_date"])[:10] for report in person_reports if report.get("meeting_date")]
        last_report_date = max(report_dates) if report_dates else None
        overdue_followups = sum(1 for report in person_reports if report.get("follow_up_date") and str(report["follow_up_date"]) < today.isoformat())
        if person.get("status") != "active":
            report_status = "Inactive"
        elif not last_report_date:
            report_status = "No reports"
        elif last_report_date >= recent_cutoff.isoformat():
            report_status = "On track"
        else:
            report_status = "Needs attention"
        summaries.append({
            **safe_user(person),
            "organization_count": sum(1 for row in orgs if str(row["placement_manager_id"]) == person_id),
            "contact_count": sum(1 for row in contacts if str(row["placement_manager_id"]) == person_id),
            "report_count": len(person_reports),
            "card_count": sum(1 for row in cards if str(row["placement_manager_id"]) == person_id),
            "last_report_date": last_report_date,
            "overdue_followups": overdue_followups,
            "pending_actions": len(person_actions),
            "report_status": report_status,
        })
    overdue_reports = sum(1 for report in reports if report.get("follow_up_date") and str(report["follow_up_date"]) < today.isoformat())
    return {"role": user.get("role"), "masked": masked, "users": summaries, "totals": {"organizations": len(orgs), "contacts": len(contacts), "reports": len(reports), "cards": len(cards), "overdue_reports": overdue_reports, "pending_actions": len(action_items)}}


@app.get("/api/team/overview")
def get_team_overview(user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    return team_summary(user)


@app.get("/api/admin/universities")
def list_universities(user=Depends(require_roles("super_admin"))):
    return db.table("universities").select("*").order("created_at", desc=True).execute().data or []


@app.post("/api/admin/universities", status_code=201)
def create_university(payload: UniversityIn, user=Depends(require_roles("super_admin"))):
    created = db.table("universities").insert({**payload.model_dump(), "created_by": user["id"]}).execute().data[0]
    record_audit(user, "created", "university", created.get("id"), created.get("id"), {"name": created.get("name"), "city": created.get("city")})
    return created


@app.patch("/api/admin/universities/{university_id}")
def update_university(university_id: str, payload: UserStatusIn, user=Depends(require_roles("super_admin"))):
    result = db.table("universities").update({"status": payload.status, "updated_at": now().isoformat()}).eq("id", university_id).execute()
    if not result.data:
        fail("University not found", 404)
    record_audit(user, "status_changed", "university", university_id, university_id, {"status": payload.status})
    return result.data[0]


@app.get("/api/admin/users")
def list_all_users(user=Depends(require_roles("super_admin"))):
    return db.table("profiles").select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at,must_change_password").order("created_at", desc=True).execute().data or []


@app.post("/api/admin/users", status_code=201)
def create_university_admin(payload: UserIn, user=Depends(require_roles("super_admin"))):
    if not can_manage_target(user, payload.role) or payload.role != "university_admin" or not payload.university_id:
        fail("Super admin can create a university administrator with a university assignment", 403)
    return create_user(payload, user)


@app.get("/api/team/users")
def list_team_users(user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    people = add_report_names(profile_list_for_user_ids(team_ids(user)), user.get("university_id"))
    people = [person for person in people if str(person.get("id")) != str(user["id"])]
    if user.get("role") == "university_admin":
        people = [person for person in people if person.get("role") != "university_admin"]
    elif user.get("role") == "coordinator":
        people = [person for person in people if str(person.get("reports_to")) == str(user["id"])]
    return people


@app.post("/api/team/users", status_code=201)
def create_team_user(payload: UserIn, user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    if user.get("role") not in {"university_admin", "coordinator"}:
        fail("Only a university administrator or coordinator can add team accounts", 403)
    if not can_manage_target(user, payload.role):
        fail("You cannot create this role", 403)
    if payload.university_id and payload.university_id != user.get("university_id"):
        fail("User must belong to your university", 403)
    payload.university_id = user.get("university_id")
    return create_user(payload, user)


def create_user(payload: UserIn, actor: dict[str, Any]) -> dict[str, Any]:
    if get_profile_by_email(payload.email):
        fail("An account with this email already exists", 409)
    row = {
        "id": str(uuid.uuid4()),
        "email": payload.email.strip().lower(),
        "full_name": payload.full_name.strip(),
        "role": payload.role,
        "status": "active",
        "password_hash": password_hash(payload.password),
        "university_id": payload.university_id,
        "reports_to": actor["id"] if actor.get("role") != "super_admin" else None,
        "must_change_password": True,
    }
    created = db.table("profiles").insert(row).execute().data[0]
    safe_created = safe_user(created)
    record_audit(actor, "created", "account", created.get("id"), created.get("university_id"), {"role": created.get("role"), "email": created.get("email")})
    create_notification(str(created["id"]), "password_change_required", "Change your password", "Your account was created with an initial password. Change it after signing in.", created.get("university_id"), "account", created.get("id"), "Settings")
    return safe_created


@app.patch("/api/team/users/{user_id}")
def update_team_user(user_id: str, payload: TeamUserUpdateIn, user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    if user.get("role") not in {"university_admin", "coordinator"}:
        fail("Only a university administrator or coordinator can manage team accounts", 403)
    if user_id not in team_ids(user) or user_id == str(user["id"]):
        fail("User is not in your managed team", 403)
    target = get_profile(user_id)
    if not target:
        fail("Team member not found", 404)
    if target.get("role") in {"super_admin", "university_admin"}:
        fail("Only the super admin can manage university administrator accounts", 403)
    if user.get("role") == "coordinator" and (
        str(target.get("reports_to")) != str(user["id"])
        or target.get("role") not in {"regional_manager", "placement_manager"}
    ):
        fail("You can only manage your own regional managers and placement managers", 403)
    updates: dict[str, Any] = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name.strip()
    if payload.email is not None:
        normalized_email = payload.email.strip().lower()
        existing = get_profile_by_email(normalized_email)
        if existing and str(existing["id"]) != user_id:
            fail("An account with this email already exists", 409)
        updates["email"] = normalized_email
    if payload.password is not None:
        updates["password_hash"] = password_hash(payload.password)
        updates["must_change_password"] = True
    if payload.status is not None:
        updates["status"] = payload.status
    if not updates:
        return safe_user(target)
    result = db.table("profiles").update(updates).eq("id", user_id).execute()
    if not result.data:
        fail("Team member not found", 404)
    invalidate_profile_cache(user_id, target.get("email"))
    if payload.status == "inactive":
        db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user_id).is_("revoked_at", "null").execute()
        create_notification(user_id, "account_deactivated", "Account deactivated", "Your account was deactivated by an authorized manager.", target.get("university_id"), "account", user_id, "Team")
    elif payload.status == "active":
        create_notification(user_id, "account_reactivated", "Account reactivated", "Your account was reactivated and can be used again.", target.get("university_id"), "account", user_id, "Team")
    record_audit(user, "updated", "account", user_id, target.get("university_id"), {"fields": list(updates.keys()), "status": payload.status})
    return safe_user(result.data[0])


@app.delete("/api/team/users/{user_id}")
def delete_team_user(user_id: str, user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    if user.get("role") not in {"university_admin", "coordinator"}:
        fail("Only a university administrator or coordinator can remove team accounts", 403)
    if user_id not in team_ids(user) or user_id == str(user["id"]):
        fail("User is not in your managed team", 403)
    target = get_profile(user_id)
    if not target:
        fail("Team member not found", 404)
    if target.get("role") in {"super_admin", "university_admin"}:
        fail("Only the super admin can manage university administrator accounts", 403)
    if user.get("role") == "coordinator" and (
        str(target.get("reports_to")) != str(user["id"])
        or target.get("role") not in {"regional_manager", "placement_manager"}
    ):
        fail("You can only manage your own regional managers and placement managers", 403)
    if db.table("profiles").select("id", count="exact").eq("reports_to", user_id).execute().count:
        fail("Deactivate this account instead because it has team members assigned to it", 409)
    owned_tables = ("organizations", "contacts", "meeting_reports", "meeting_action_items", "kanban_cards", "kanban_stages")
    for table in owned_tables:
        if db.table(table).select("id", count="exact").eq("placement_manager_id", user_id).execute().count:
            fail("Deactivate this account instead because it has CRM history", 409)
    db.table("auth_sessions").delete().eq("user_id", user_id).execute()
    db.table("password_reset_requests").delete().eq("user_id", user_id).execute()
    db.table("profiles").delete().eq("id", user_id).execute()
    invalidate_profile_cache(user_id, target.get("email"))
    record_audit(user, "deleted", "account", user_id, target.get("university_id"), {"role": target.get("role"), "email": target.get("email")})
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, payload: UserStatusIn, user=Depends(require_roles("super_admin"))):
    result = db.table("profiles").update({"status": payload.status}).eq("id", user_id).neq("role", "super_admin").execute()
    if not result.data:
        fail("User not found", 404)
    invalidate_profile_cache(user_id, result.data[0].get("email"))
    if payload.status == "inactive":
        db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user_id).is_("revoked_at", "null").execute()
        create_notification(user_id, "account_deactivated", "Account deactivated", "Your account was deactivated by the super admin.", result.data[0].get("university_id"), "account", user_id, "Users")
    else:
        create_notification(user_id, "account_reactivated", "Account reactivated", "Your account was reactivated by the super admin.", result.data[0].get("university_id"), "account", user_id, "Users")
    record_audit(user, "status_changed", "account", user_id, result.data[0].get("university_id"), {"status": payload.status})
    return safe_user(result.data[0])
