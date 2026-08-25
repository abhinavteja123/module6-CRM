import hashlib
import os
import secrets
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from threading import RLock
from typing import Any, Literal

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, status
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
bearer = HTTPBearer(auto_error=False)
profile_cache: dict[str, tuple[float, dict[str, Any]]] = {}
profile_cache_lock = RLock()
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
    def dependency(user=Depends(current_user)):
        if user.get("role") not in roles:
            fail("You do not have permission for this action", status.HTTP_403_FORBIDDEN)
        return user

    return dependency


def all_profiles_for_university(university_id: str | None) -> list[dict[str, Any]]:
    if not university_id:
        return []
    return (
        db.table("profiles")
        .select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at")
        .eq("university_id", university_id)
        .execute()
        .data
        or []
    )


def team_ids(user: dict[str, Any]) -> list[str]:
    role = user.get("role")
    user_id = str(user["id"])
    if role == "super_admin":
        return []
    if role == "university_admin":
        return [str(item["id"]) for item in all_profiles_for_university(user.get("university_id"))]
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


class ContactIn(BaseModel):
    organization_id: str
    name: str = Field(min_length=1)
    designation: str = Field(min_length=1)
    email: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    linkedin_url: str = Field(min_length=1)
    notes: str = Field(min_length=1)


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
def login(payload: LoginIn, background_tasks: BackgroundTasks):
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
    return {"user": safe_user(user), "profile": safe_user(user), **issue_tokens(user)}


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
def logout(payload: RefreshIn | None = None, user=Depends(current_user)):
    query = db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user["id"]).is_("revoked_at", "null")
    if payload and payload.refresh_token:
        query = query.eq("refresh_token_hash", hash_token(payload.refresh_token))
    query.execute()
    return {"ok": True}


@app.get("/api/me")
def me(user=Depends(current_user)):
    return safe_user(user)


@app.post("/api/auth/change-password")
def change_password(payload: PasswordChangeIn, user=Depends(current_user)):
    if not password_matches(payload.current_password, user.get("password_hash")):
        fail("Current password is incorrect")
    new_hash = password_hash(payload.new_password)
    db.table("profiles").update({"password_hash": new_hash, "must_change_password": False}).eq("id", user["id"]).execute()
    invalidate_profile_cache(str(user["id"]), user.get("email"))
    db.table("auth_sessions").update({"revoked_at": now().isoformat()}).eq("user_id", user["id"]).is_("revoked_at", "null").execute()
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
    return scoped_rows("organizations", user).order("created_at", desc=True).execute().data or []


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
    return db.table("organizations").insert(data).execute().data[0]


@app.delete("/api/organizations/{item_id}")
def delete_organization(item_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("organizations").delete().eq("id", item_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Organization not found", 404)
    return {"ok": True}


@app.get("/api/contacts")
def list_contacts(user=Depends(require_roles("placement_manager", "university_admin"))):
    return scoped_rows("contacts", user).order("created_at", desc=True).execute().data or []


@app.post("/api/contacts", status_code=201)
def create_contact(payload: ContactIn, user=Depends(require_roles("placement_manager"))):
    if not scoped_rows("organizations", user, payload.organization_id).execute().data:
        fail("Organization does not belong to the current manager", 403)
    return db.table("contacts").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]


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
    return reports


@app.post("/api/meeting-reports", status_code=201)
def create_report(payload: ReportIn, user=Depends(require_roles("placement_manager"))):
    data = payload.model_dump(mode="json")
    if not scoped_rows("organizations", user, data["organization_id"]).execute().data or not scoped_rows("contacts", user, data["contact_id"]).execute().data:
        fail("Linked organization or contact does not belong to the current manager", 403)
    item_texts = [line.strip() for line in data.pop("action_items").splitlines() if line.strip()]
    report = db.table("meeting_reports").insert({**data, "action_items": "\n".join(item_texts), "placement_manager_id": user["id"]}).execute().data[0]
    items = [{"meeting_report_id": report["id"], "placement_manager_id": user["id"], "text": text, "position": index} for index, text in enumerate(item_texts)]
    report["action_items_list"] = db.table("meeting_action_items").insert(items).execute().data if items else []
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
    return report


@app.delete("/api/meeting-reports/{report_id}")
def delete_report(report_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("meeting_reports").delete().eq("id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Meeting report not found", 404)
    return {"ok": True}


@app.patch("/api/meeting-reports/{report_id}/actions/{action_id}")
def update_action_item(report_id: str, action_id: str, payload: ActionItemUpdate, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("meeting_reports", report_id, user)
    result = db.table("meeting_action_items").update({"is_completed": payload.is_completed}).eq("id", action_id).eq("meeting_report_id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Action item not found", 404)
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
    return db.table("kanban_stages").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]


@app.patch("/api/kanban/stages/{stage_id}")
def update_stage(stage_id: str, payload: StageUpdate, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("kanban_stages", stage_id, user)
    update = payload.model_dump(exclude_unset=True)
    if not update:
        fail("No stage changes supplied")
    return db.table("kanban_stages").update(update).eq("id", stage_id).eq("placement_manager_id", user["id"]).execute().data[0]


@app.delete("/api/kanban/stages/{stage_id}")
def delete_stage(stage_id: str, user=Depends(require_roles("placement_manager"))):
    require_owned_or_team("kanban_stages", stage_id, user)
    if scoped_rows("kanban_cards", user).eq("stage_id", stage_id).execute().data:
        fail("Move or delete the cards in this stage before deleting it", 409)
    result = db.table("kanban_stages").delete().eq("id", stage_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Stage not found", 404)
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
    return db.table("kanban_cards").insert({**data, "placement_manager_id": user["id"]}).execute().data[0]


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
    return db.table("kanban_cards").update(update).eq("id", card_id).eq("placement_manager_id", user["id"]).execute().data[0]


@app.delete("/api/kanban/cards/{card_id}")
def delete_card(card_id: str, user=Depends(require_roles("placement_manager"))):
    result = db.table("kanban_cards").delete().eq("id", card_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Card not found", 404)
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
    people = add_report_names(profile_list_for_user_ids(ids), user.get("university_id"))
    if user.get("role") == "university_admin":
        people = [person for person in people if person.get("role") != "university_admin"]
    orgs = db.table("organizations").select("id,placement_manager_id,name").in_("placement_manager_id", ids).execute().data if ids else []
    contacts = db.table("contacts").select("id,placement_manager_id,organization_id,name,email,phone").in_("placement_manager_id", ids).execute().data if ids else []
    reports = db.table("meeting_reports").select("id,placement_manager_id").in_("placement_manager_id", ids).execute().data if ids else []
    cards = db.table("kanban_cards").select("id,placement_manager_id,stage_id").in_("placement_manager_id", ids).execute().data if ids else []
    masked = user.get("role") in {"coordinator", "regional_manager"}
    summaries = []
    for person in people:
        person_id = str(person["id"])
        summaries.append({
            **safe_user(person),
            "organization_count": sum(1 for row in orgs if str(row["placement_manager_id"]) == person_id),
            "contact_count": sum(1 for row in contacts if str(row["placement_manager_id"]) == person_id),
            "report_count": sum(1 for row in reports if str(row["placement_manager_id"]) == person_id),
            "card_count": sum(1 for row in cards if str(row["placement_manager_id"]) == person_id),
        })
    return {"role": user.get("role"), "masked": masked, "users": summaries, "totals": {"organizations": len(orgs), "contacts": len(contacts), "reports": len(reports), "cards": len(cards)}}


@app.get("/api/team/overview")
def get_team_overview(user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    return team_summary(user)


@app.get("/api/admin/universities")
def list_universities(user=Depends(require_roles("super_admin"))):
    return db.table("universities").select("*").order("created_at", desc=True).execute().data or []


@app.post("/api/admin/universities", status_code=201)
def create_university(payload: UniversityIn, user=Depends(require_roles("super_admin"))):
    return db.table("universities").insert({**payload.model_dump(), "created_by": user["id"]}).execute().data[0]


@app.patch("/api/admin/universities/{university_id}")
def update_university(university_id: str, payload: UserStatusIn, user=Depends(require_roles("super_admin"))):
    result = db.table("universities").update({"status": payload.status, "updated_at": now().isoformat()}).eq("id", university_id).execute()
    if not result.data:
        fail("University not found", 404)
    return result.data[0]


@app.get("/api/admin/users")
def list_all_users(user=Depends(require_roles("super_admin"))):
    return db.table("profiles").select("id,full_name,email,role,status,university_id,reports_to,created_at,last_login_at").order("created_at", desc=True).execute().data or []


@app.post("/api/admin/users", status_code=201)
def create_university_admin(payload: UserIn, user=Depends(require_roles("super_admin"))):
    if not can_manage_target(user, payload.role) or payload.role != "university_admin" or not payload.university_id:
        fail("Super admin can create a university administrator with a university assignment", 403)
    return create_user(payload, user)


@app.get("/api/team/users")
def list_team_users(user=Depends(require_roles("university_admin", "coordinator", "regional_manager"))):
    people = add_report_names(profile_list_for_user_ids(team_ids(user)), user.get("university_id"))
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
    return safe_user(db.table("profiles").insert(row).execute().data[0])


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
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, payload: UserStatusIn, user=Depends(require_roles("super_admin"))):
    result = db.table("profiles").update({"status": payload.status}).eq("id", user_id).neq("role", "super_admin").execute()
    if not result.data:
        fail("User not found", 404)
    invalidate_profile_cache(user_id, result.data[0].get("email"))
    return safe_user(result.data[0])
