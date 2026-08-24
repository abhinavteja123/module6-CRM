import os
from datetime import date, datetime, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from supabase import Client, create_client

load_dotenv()


class Settings(BaseSettings):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


settings = Settings()
if not settings.supabase_url or not settings.supabase_service_role_key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

db: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
bearer = HTTPBearer(auto_error=False)
app = FastAPI(title="Placement CRM API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=list(dict.fromkeys([settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"])), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DEFAULT_KANBAN_STAGES = [
    {"name": "Prospecting", "color": "#64748b", "position": 0},
    {"name": "Meeting Scheduled", "color": "#2563eb", "position": 1},
    {"name": "Proposal Sent", "color": "#f59e0b", "position": 2},
    {"name": "Closed Won", "color": "#10b981", "position": 3},
]


def fail(message: str, code: int = 400):
    raise HTTPException(status_code=code, detail=message)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, Any]:
    if not credentials:
        fail("Authentication required", status.HTTP_401_UNAUTHORIZED)
    try:
        response = db.auth.get_user(credentials.credentials)
        user = response.user
        if not user:
            fail("Invalid session", status.HTTP_401_UNAUTHORIZED)
        return {"id": str(user.id), "email": user.email, "user": user}
    except HTTPException:
        raise
    except Exception:
        fail("Invalid or expired session", status.HTTP_401_UNAUTHORIZED)


def profile(user=Depends(current_user)):
    row = db.table("profiles").select("*").eq("id", user["id"]).single().execute().data
    if not row or row.get("status") != "active":
        fail("Inactive or missing profile", status.HTTP_403_FORBIDDEN)
    return {**user, "profile": row}


def admin(user=Depends(profile)):
    if user["profile"].get("role") != "admin":
        fail("Admin access required", status.HTTP_403_FORBIDDEN)
    return user


def owned(table: str, user_id: str, row_id: str | None = None):
    query = db.table(table).select("*").eq("placement_manager_id", user_id)
    if row_id:
        query = query.eq("id", row_id)
    return query


class OrganizationIn(BaseModel):
    name: str = Field(min_length=1)
    industry: str = Field(min_length=1)
    website: str = Field(min_length=1)
    city: str = Field(min_length=1)
    status: str = Field(min_length=1)
    notes: str = Field(min_length=1)


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


class CardMove(BaseModel):
    stage_id: str
    position: int | None = None


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


class InviteIn(BaseModel):
    email: str
    full_name: str = Field(min_length=1)
    password: str = Field(min_length=8)


@app.get("/health")
def health():
    return {"ok": True, "service": "placement-crm-api"}


@app.get("/api/me")
def me(user=Depends(profile)):
    return user["profile"]


@app.get("/api/organizations")
def list_organizations(user=Depends(profile)):
    return owned("organizations", user["id"]).order("created_at", desc=True).execute().data or []


@app.post("/api/organizations", status_code=201)
def create_organization(payload: OrganizationIn, user=Depends(profile)):
    return db.table("organizations").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]


@app.delete("/api/organizations/{item_id}")
def delete_organization(item_id: str, user=Depends(profile)):
    result = db.table("organizations").delete().eq("id", item_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Organization not found", 404)
    return {"ok": True}


@app.get("/api/contacts")
def list_contacts(user=Depends(profile)):
    return owned("contacts", user["id"]).order("created_at", desc=True).execute().data or []


@app.post("/api/contacts", status_code=201)
def create_contact(payload: ContactIn, user=Depends(profile)):
    org = owned("organizations", user["id"], payload.organization_id).execute().data
    if not org:
        fail("Organization does not belong to the current manager", 403)
    return db.table("contacts").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]


@app.get("/api/meeting-reports")
def list_reports(user=Depends(profile)):
    reports = owned("meeting_reports", user["id"]).order("meeting_date", desc=True).execute().data or []
    actions = db.table("meeting_action_items").select("*").eq("placement_manager_id", user["id"]).order("position").execute().data or []
    by_report = {}
    for action in actions:
        by_report.setdefault(action["meeting_report_id"], []).append(action)
    for report in reports:
        report["action_items_list"] = by_report.get(report["id"], [])
    return reports


@app.post("/api/meeting-reports", status_code=201)
def create_report(payload: ReportIn, user=Depends(profile)):
    data = payload.model_dump(mode="json")
    if not owned("organizations", user["id"], data["organization_id"]).execute().data:
        fail("Organization does not belong to the current manager", 403)
    if not owned("contacts", user["id"], data["contact_id"]).execute().data:
        fail("Contact does not belong to the current manager", 403)
    item_texts = [line.strip() for line in data.pop("action_items").splitlines() if line.strip()]
    report = db.table("meeting_reports").insert({**data, "action_items": "\n".join(item_texts), "placement_manager_id": user["id"]}).execute().data[0]
    items = [{"meeting_report_id": report["id"], "placement_manager_id": user["id"], "text": text, "position": index} for index, text in enumerate(item_texts)]
    report["action_items_list"] = db.table("meeting_action_items").insert(items).execute().data if items else []
    return report


@app.patch("/api/meeting-reports/{report_id}")
def update_report(report_id: str, payload: ReportIn, user=Depends(profile)):
    if not owned("meeting_reports", user["id"], report_id).execute().data:
        fail("Meeting report not found", 404)
    data = payload.model_dump(mode="json")
    if not owned("organizations", user["id"], data["organization_id"]).execute().data or not owned("contacts", user["id"], data["contact_id"]).execute().data:
        fail("Linked organization or contact does not belong to the current manager", 403)
    item_texts = [line.strip() for line in data.pop("action_items").splitlines() if line.strip()]
    report = db.table("meeting_reports").update({**data, "action_items": "\n".join(item_texts)}).eq("id", report_id).eq("placement_manager_id", user["id"]).execute().data[0]
    db.table("meeting_action_items").delete().eq("meeting_report_id", report_id).eq("placement_manager_id", user["id"]).execute()
    items = [{"meeting_report_id": report_id, "placement_manager_id": user["id"], "text": text, "position": index} for index, text in enumerate(item_texts)]
    report["action_items_list"] = db.table("meeting_action_items").insert(items).execute().data if items else []
    return report


@app.delete("/api/meeting-reports/{report_id}")
def delete_report(report_id: str, user=Depends(profile)):
    result = db.table("meeting_reports").delete().eq("id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Meeting report not found", 404)
    return {"ok": True}


@app.patch("/api/meeting-reports/{report_id}/actions/{action_id}")
def update_action_item(report_id: str, action_id: str, payload: ActionItemUpdate, user=Depends(profile)):
    if not owned("meeting_reports", user["id"], report_id).execute().data:
        fail("Meeting report not found", 404)
    result = db.table("meeting_action_items").update({"is_completed": payload.is_completed}).eq("id", action_id).eq("meeting_report_id", report_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Action item not found", 404)
    return result.data[0]


@app.get("/api/kanban")
def kanban(user=Depends(profile)):
    stages = owned("kanban_stages", user["id"]).order("position").execute().data or []
    if not stages:
        stage_rows = [
            {**stage, "placement_manager_id": user["id"]}
            for stage in DEFAULT_KANBAN_STAGES
        ]
        stages = db.table("kanban_stages").insert(stage_rows).execute().data or []
    cards = owned("kanban_cards", user["id"]).order("position").execute().data or []
    return {"stages": stages, "cards": cards}


@app.post("/api/kanban/stages", status_code=201)
def create_stage(payload: StageIn, user=Depends(profile)):
    return db.table("kanban_stages").insert({**payload.model_dump(), "placement_manager_id": user["id"]}).execute().data[0]


@app.patch("/api/kanban/stages/{stage_id}")
def update_stage(stage_id: str, payload: StageUpdate, user=Depends(profile)):
    if not owned("kanban_stages", user["id"], stage_id).execute().data:
        fail("Stage not found", 404)
    update = payload.model_dump(exclude_unset=True)
    if not update:
        fail("No stage changes supplied")
    result = db.table("kanban_stages").update(update).eq("id", stage_id).eq("placement_manager_id", user["id"]).execute()
    return result.data[0]


@app.delete("/api/kanban/stages/{stage_id}")
def delete_stage(stage_id: str, user=Depends(profile)):
    if not owned("kanban_stages", user["id"], stage_id).execute().data:
        fail("Stage not found", 404)
    if owned("kanban_cards", user["id"]).eq("stage_id", stage_id).execute().data:
        fail("Move or delete the cards in this stage before deleting it", 409)
    result = db.table("kanban_stages").delete().eq("id", stage_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Stage not found", 404)
    return {"ok": True}


@app.post("/api/kanban/cards", status_code=201)
def create_card(payload: CardIn, user=Depends(profile)):
    stage = owned("kanban_stages", user["id"], payload.stage_id).execute().data
    if not stage:
        fail("Stage does not belong to the current manager", 403)
    if not owned("organizations", user["id"], payload.organization_id).execute().data:
        fail("Organization does not belong to the current manager", 403)
    stage_row = stage[0]
    if stage_row.get("wip_limit") is not None:
        current = owned("kanban_cards", user["id"]).eq("stage_id", payload.stage_id).execute().data or []
        if len(current) >= stage_row["wip_limit"]:
            fail(f"WIP limit reached for {stage_row['name']}", 409)
    last = owned("kanban_cards", user["id"]).eq("stage_id", payload.stage_id).order("position", desc=True).limit(1).execute().data or []
    data = payload.model_dump(mode="json")
    data["position"] = (last[0]["position"] + 1) if last else 0
    return db.table("kanban_cards").insert({**data, "placement_manager_id": user["id"]}).execute().data[0]


@app.patch("/api/kanban/cards/{card_id}")
def update_card(card_id: str, payload: CardUpdate, user=Depends(profile)):
    existing = owned("kanban_cards", user["id"], card_id).execute().data
    if not existing:
        fail("Card not found", 404)
    current = existing[0]
    update = {key: value for key, value in payload.model_dump(mode="json").items() if value is not None}
    target_stage_id = update.get("stage_id", current["stage_id"])
    target_stage = owned("kanban_stages", user["id"], target_stage_id).execute().data
    if not target_stage:
        fail("Stage does not belong to the current manager", 403)
    if "organization_id" in update and not owned("organizations", user["id"], update["organization_id"]).execute().data:
        fail("Organization does not belong to the current manager", 403)
    if target_stage_id != current["stage_id"] and target_stage[0].get("wip_limit") is not None:
        cards_in_target = owned("kanban_cards", user["id"]).eq("stage_id", target_stage_id).execute().data or []
        if len(cards_in_target) >= target_stage[0]["wip_limit"]:
            fail(f"WIP limit reached for {target_stage[0]['name']}", 409)
        if "position" not in update:
            last = owned("kanban_cards", user["id"]).eq("stage_id", target_stage_id).order("position", desc=True).limit(1).execute().data or []
            update["position"] = (last[0]["position"] + 1) if last else 0
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    if target_stage[0]["name"].lower() in {"closed won", "done", "completed"}:
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update["completed_at"] = None
    return db.table("kanban_cards").update(update).eq("id", card_id).eq("placement_manager_id", user["id"]).execute().data[0]


@app.delete("/api/kanban/cards/{card_id}")
def delete_card(card_id: str, user=Depends(profile)):
    result = db.table("kanban_cards").delete().eq("id", card_id).eq("placement_manager_id", user["id"]).execute()
    if not result.data:
        fail("Card not found", 404)
    return {"ok": True}


@app.get("/api/admin/managers")
def list_managers(user=Depends(admin)):
    return db.table("profiles").select("*").eq("role", "placement_manager").order("created_at", desc=True).execute().data or []


@app.post("/api/admin/managers/invite", status_code=201)
def invite_manager(payload: InviteIn, user=Depends(admin)):
    invited = db.auth.admin.create_user({"email": payload.email, "password": payload.password, "email_confirm": True, "user_metadata": {"full_name": payload.full_name}})
    auth_user = invited.user
    if not auth_user:
        fail("Unable to invite user")
    row = db.table("profiles").upsert({"id": str(auth_user.id), "email": payload.email, "full_name": payload.full_name, "role": "placement_manager", "status": "active"}).execute().data
    return row[0] if row else {"id": str(auth_user.id), "email": payload.email}


@app.patch("/api/admin/managers/{manager_id}/deactivate")
def deactivate_manager(manager_id: str, user=Depends(admin)):
    result = db.table("profiles").update({"status": "inactive"}).eq("id", manager_id).eq("role", "placement_manager").execute()
    if not result.data:
        fail("Placement manager not found", 404)
    try:
        db.auth.admin.update_user_by_id(manager_id, {"ban_duration": "876000h"})
    except Exception:
        pass
    return result.data[0]


@app.delete("/api/admin/managers/{manager_id}")
def delete_manager(manager_id: str, user=Depends(admin)):
    target = db.table("profiles").select("id,role").eq("id", manager_id).eq("role", "placement_manager").single().execute().data
    if not target:
        fail("Placement manager not found", 404)
    try:
        db.auth.admin.delete_user(manager_id)
    except Exception as exc:
        fail(f"Unable to delete auth user: {exc}")
    return {"ok": True, "id": manager_id}
