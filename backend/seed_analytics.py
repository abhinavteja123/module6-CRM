"""Additive demo data for exercising the placement analytics workspace.

Run from the backend directory with the backend virtual environment:
    .\\backend\\.venv\\Scripts\\python.exe seed_analytics.py

The seed is repeatable. It only creates records identified by the analytics
seed marker and never deletes or updates existing business records.
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta

from app.main import db


SEED_MARKER = "Analytics seed dataset"
DEFAULT_UNIVERSITY = "SRM University"


def get_rows(table: str, columns: str = "*") -> list[dict]:
    return db.table(table).select(columns).execute().data or []


def select_university(name: str | None, university_id: str | None) -> dict:
    universities = get_rows("universities", "id,name,status")
    if university_id:
        matches = [item for item in universities if str(item.get("id")) == university_id]
    else:
        wanted = (name or DEFAULT_UNIVERSITY).strip().casefold()
        matches = [item for item in universities if str(item.get("name", "")).strip().casefold() == wanted]
    if not matches:
        raise SystemExit("No matching university found. Use --university-id or --university-name.")
    return matches[0]


def ensure_categories(university_id: str, admin_id: str) -> list[dict]:
    categories = [item for item in get_rows("company_categories") if str(item.get("university_id")) == university_id]
    if len(categories) >= 4:
        return sorted(categories, key=lambda item: str(item.get("name", "")))
    additions = [
        ("Analytics Seed - Emerging", 3, 6, "Early-career and emerging hiring programs."),
        ("Analytics Seed - Premium", 18, 45, "High-value hiring programs for premium roles."),
        ("Analytics Seed - Core", 6, 12, "Core engineering and business hiring programs."),
        ("Analytics Seed - Global", 12, 30, "Global and international hiring programs."),
    ]
    existing_names = {str(item.get("name", "")).casefold() for item in categories}
    for name, minimum, maximum, description in additions:
        if name.casefold() in existing_names:
            continue
        inserted = db.table("company_categories").insert({
            "university_id": university_id,
            "name": name,
            "min_ctc_lpa": minimum,
            "max_ctc_lpa": maximum,
            "description": description,
            "created_by": admin_id,
        }).execute().data or []
        categories.extend(inserted)
        if len(categories) >= 4:
            break
    return sorted(categories, key=lambda item: str(item.get("name", "")))


def ensure_seasons(university_id: str, admin_id: str) -> list[dict]:
    seasons = [item for item in get_rows("placement_seasons") if str(item.get("university_id")) == university_id]
    if len(seasons) >= 2:
        return sorted(seasons, key=lambda item: str(item.get("start_date", "")))
    today = date.today()
    additions = [
        ("Analytics Seed 2026-27", "2026-2027", today - timedelta(days=45), today + timedelta(days=260)),
        ("Analytics Seed 2027-28", "2027-2028", today + timedelta(days=30), today + timedelta(days=390)),
    ]
    existing_names = {str(item.get("name", "")).casefold() for item in seasons}
    for name, academic_year, start_date, end_date in additions:
        if name.casefold() in existing_names:
            continue
        inserted = db.table("placement_seasons").insert({
            "university_id": university_id,
            "name": name,
            "academic_year": academic_year,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "active",
            "created_by": admin_id,
        }).execute().data or []
        seasons.extend(inserted)
        if len(seasons) >= 2:
            break
    return sorted(seasons, key=lambda item: str(item.get("start_date", "")))


def ensure_organizations(university_id: str, managers: list[dict], categories: list[dict]) -> list[dict]:
    specs = [
        ("Accenture", "Technology Services", "Bengaluru", "active"),
        ("Wipro", "IT Services", "Hyderabad", "active"),
        ("Deloitte", "Consulting", "Pune", "prospect"),
        ("Cognizant", "Technology Services", "Chennai", "active"),
        ("Amazon", "E-commerce", "Bengaluru", "active"),
        ("Microsoft", "Cloud and Software", "Hyderabad", "active"),
        ("L&T Technology Services", "Engineering Services", "Mumbai", "prospect"),
        ("Tata Motors", "Automotive", "Pune", "active"),
        ("Zomato", "Consumer Technology", "Gurugram", "prospect"),
        ("HDFC Bank", "Financial Services", "Mumbai", "active"),
        ("ServiceNow", "Enterprise Software", "Noida", "active"),
        ("Bosch", "Automotive Technology", "Chennai", "inactive"),
    ]
    existing = [item for item in get_rows("organizations") if str(item.get("university_id")) == university_id]
    seeded = [item for item in existing if SEED_MARKER in str(item.get("notes", ""))]
    by_name = {str(item.get("name", "")).casefold(): item for item in seeded}
    for index, (name, industry, city, status) in enumerate(specs):
        key = name.casefold()
        if key in by_name:
            continue
        manager_id = str(managers[index % len(managers)]["id"])
        category_id = categories[index % len(categories)]["id"] if categories else None
        inserted = db.table("organizations").insert({
            "university_id": university_id,
            "placement_manager_id": manager_id,
            "name": name,
            "category_id": category_id,
            "expected_ctc": f"{5 + (index % 5) * 3}-{9 + (index % 5) * 4} LPA",
            "industry": industry,
            "website": f"https://www.{name.lower().replace(' ', '').replace('&', 'and')}.example.com",
            "city": city,
            "status": status,
            "notes": f"{SEED_MARKER}: analytics scenario {index + 1}",
        }).execute().data or []
        if inserted:
            by_name[key] = inserted[0]
    return list(by_name.values())


def ensure_targets(university_id: str, admin_id: str, seasons: list[dict], categories: list[dict], managers: list[dict]) -> int:
    existing = [item for item in get_rows("placement_targets") if str(item.get("university_id")) == university_id]
    keys = {(str(item.get("season_id")), str(item.get("user_id")), str(item.get("category_id"))) for item in existing}
    created = 0
    for manager_index, manager in enumerate(managers):
        for season_index, season in enumerate(seasons[:2]):
            category = categories[(manager_index + season_index) % len(categories)]
            key = (str(season["id"]), str(manager["id"]), str(category["id"]))
            if key in keys:
                continue
            db.table("placement_targets").insert({
                "university_id": university_id,
                "season_id": season["id"],
                "user_id": manager["id"],
                "category_id": category["id"],
                "companies_target": 8 + manager_index * 3 + season_index * 2,
                "drives_target": 4 + manager_index + season_index,
                "offers_target": 10 + manager_index * 2,
                "students_placed_target": 12 + manager_index * 4,
                "students_joined_target": 9 + manager_index * 3,
                "created_by": admin_id,
            }).execute()
            keys.add(key)
            created += 1
    return created


def ensure_metrics(university_id: str, seasons: list[dict], categories: list[dict], organizations: list[dict]) -> int:
    statuses = ["prospect", "outreach", "in_talks", "negotiation", "drive_scheduled", "drive_completed", "offer_stage", "placed", "joined", "on_hold", "cancelled", "discussion"]
    outlooks = ["neutral", "positive", "positive", "neutral", "positive", "positive", "positive", "positive", "positive", "negative", "negative", "neutral"]
    drives = ["not_scheduled", "tentative", "scheduled", "scheduled", "scheduled", "completed", "completed", "completed", "completed", "cancelled", "cancelled", "tentative"]
    existing = [item for item in get_rows("placement_metrics") if str(item.get("university_id")) == university_id]
    keys = {(str(item.get("season_id")), str(item.get("organization_id")), str(item.get("placement_manager_id"))) for item in existing}
    created = 0
    today = date.today()
    for index, organization in enumerate(organizations):
        season = seasons[index % len(seasons)]
        manager_id = organization["placement_manager_id"]
        key = (str(season["id"]), str(organization["id"]), str(manager_id))
        if key in keys:
            continue
        status = statuses[index % len(statuses)]
        registered = (index + 2) * 9
        selected = max(0, registered - (index % 4) * 3)
        offers = max(0, selected // 3)
        placed = max(0, offers - (index % 3))
        joined = max(0, placed - (index % 2))
        expected_date = today + timedelta(days=(index - 5) * 9)
        follow_up = today + timedelta(days=(index % 7) - 3)
        db.table("placement_metrics").insert({
            "university_id": university_id,
            "season_id": season["id"],
            "organization_id": organization["id"],
            "placement_manager_id": manager_id,
            "category_id": organization.get("category_id") or categories[index % len(categories)]["id"],
            "companies_acquired": 1 if status not in {"prospect", "cancelled"} else 0,
            "drives_conducted": 1 if status in {"drive_completed", "offer_stage", "placed", "joined"} else 0,
            "offers_received": offers,
            "students_placed": placed,
            "students_joined": joined,
            "pipeline_status": status,
            "outlook": outlooks[index % len(outlooks)],
            "expected_date": expected_date.isoformat(),
            "drive_date": (today - timedelta(days=index + 1)).isoformat() if drives[index % len(drives)] == "completed" else None,
            "last_contact_date": (today - timedelta(days=index % 10)).isoformat(),
            "next_follow_up_date": follow_up.isoformat(),
            "drive_status": drives[index % len(drives)],
            "company_probability": min(95, 25 + index * 6),
            "students_registered": registered,
            "students_selected": selected,
            "students_rejected": max(0, registered - selected),
            "next_action": "Confirm hiring panel and drive slots" if status not in {"joined", "cancelled"} else "Share closure summary with the team",
            "notes": f"{SEED_MARKER}: pipeline scenario {index + 1}",
        }).execute()
        keys.add(key)
        created += 1
    return created


def ensure_contacts_and_reports(university_id: str, organizations: list[dict], managers: list[dict]) -> tuple[int, int, int]:
    contacts = [item for item in get_rows("contacts") if str(item.get("organization_id")) in {str(org["id"]) for org in organizations}]
    contact_by_org = {}
    for contact in contacts:
        contact_by_org.setdefault(str(contact["organization_id"]), []).append(contact)
    contacts_created = 0
    for index, organization in enumerate(organizations):
        if contact_by_org.get(str(organization["id"])):
            continue
        manager_id = organization["placement_manager_id"]
        inserted = db.table("contacts").insert({
            "organization_id": organization["id"],
            "placement_manager_id": manager_id,
            "name": f"{organization['name']} Talent Partner",
            "designation": "Campus Hiring Lead",
            "email": f"analytics.seed.{index + 1}@example.com",
            "phone": f"+91 90000 {10000 + index:05d}",
            "linkedin_url": "https://www.linkedin.com/in/analytics-seed-contact",
            "notes": f"{SEED_MARKER}: contact scenario",
        }).execute().data or []
        if inserted:
            contact_by_org[str(organization["id"])] = inserted
            contacts_created += len(inserted)

    reports = [item for item in get_rows("meeting_reports") if SEED_MARKER in str(item.get("summary", ""))]
    report_titles = {str(item.get("title")) for item in reports}
    reports_created = 0
    for index, organization in enumerate(organizations):
        org_contacts = contact_by_org.get(str(organization["id"])) or []
        if not org_contacts:
            continue
        title = f"{organization['name']} placement review"
        if title in report_titles:
            continue
        manager_id = organization["placement_manager_id"]
        report_date = date.today() - timedelta(days=index * 3)
        inserted = db.table("meeting_reports").insert({
            "placement_manager_id": manager_id,
            "organization_id": organization["id"],
            "contact_id": org_contacts[0]["id"],
            "meeting_date": report_date.isoformat(),
            "title": title,
            "summary": f"{SEED_MARKER}: reviewed hiring demand, campus drive readiness, and expected closure timeline.",
            "action_items": "Confirm student shortlist\nShare drive calendar",
            "attendees": "Campus Hiring Lead, Placement Team",
            "outcome": ["positive", "neutral", "follow_up_required"][index % 3],
            "follow_up_date": (report_date + timedelta(days=7)).isoformat(),
            "meeting_type": ["video_call", "in_person", "phone_call"][index % 3],
        }).execute().data or []
        if inserted:
            reports.extend(inserted)
            report_titles.add(title)
            reports_created += len(inserted)

    action_items = [item for item in get_rows("meeting_action_items") if str(item.get("meeting_report_id")) in {str(report["id"]) for report in reports}]
    action_report_ids = {str(item["meeting_report_id"]) for item in action_items}
    actions_created = 0
    for index, report in enumerate(reports):
        if str(report["id"]) in action_report_ids:
            continue
        db.table("meeting_action_items").insert([
            {"meeting_report_id": report["id"], "placement_manager_id": report["placement_manager_id"], "text": "Confirm student shortlist", "is_completed": index % 3 == 0, "position": 0},
            {"meeting_report_id": report["id"], "placement_manager_id": report["placement_manager_id"], "text": "Share drive calendar", "is_completed": False, "position": 1},
        ]).execute()
        actions_created += 2
    return contacts_created, reports_created, actions_created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed additive placement analytics data.")
    parser.add_argument("--university-id", help="Target university UUID.")
    parser.add_argument("--university-name", default=DEFAULT_UNIVERSITY, help=f"Target university name (default: {DEFAULT_UNIVERSITY}).")
    args = parser.parse_args()

    university = select_university(args.university_name, args.university_id)
    university_id = str(university["id"])
    profiles = [item for item in get_rows("profiles") if str(item.get("university_id")) == university_id]
    admins = [item for item in profiles if item.get("role") == "university_admin" and item.get("status") == "active"]
    managers = [item for item in profiles if item.get("role") == "placement_manager" and item.get("status") == "active"]
    if not admins or not managers:
        raise SystemExit("The target university needs an active university admin and placement manager first.")
    admin_id = str(admins[0]["id"])
    categories = ensure_categories(university_id, admin_id)
    seasons = ensure_seasons(university_id, admin_id)
    organizations = ensure_organizations(university_id, managers, categories)
    targets_created = ensure_targets(university_id, admin_id, seasons, categories, managers)
    metrics_created = ensure_metrics(university_id, seasons, categories, organizations)
    contacts_created, reports_created, actions_created = ensure_contacts_and_reports(university_id, organizations, managers)
    print({
        "university": university.get("name"),
        "seasons_available": len(seasons),
        "categories_available": len(categories),
        "seed_organizations": len(organizations),
        "targets_created": targets_created,
        "metrics_created": metrics_created,
        "contacts_created": contacts_created,
        "reports_created": reports_created,
        "action_items_created": actions_created,
    })


if __name__ == "__main__":
    main()
