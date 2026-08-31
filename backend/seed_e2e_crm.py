"""Additive, idempotent synthetic CRM data for end-to-end verification.

This seed targets the SRM University tenant by default and creates exactly
100 synthetic organizations, with one metric row for each organization in
each of the tenant's first two placement seasons. It also covers contacts,
meeting reports/action items, Kanban cards, targets, assignments, cities,
industries, and approval/observability records.

Nothing is deleted or updated unless it was created by this seed marker.
Run from backend/:
    .\\backend\\.venv\\Scripts\\python.exe seed_e2e_crm.py
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta
from typing import Any, Iterable

from app.main import db


SEED_MARKER = "E2E Synthetic CRM Dataset v1"
DEFAULT_UNIVERSITY = "SRM University"
TARGET_COMPANY_COUNT = 100

CITY_DATA = [
    ("Bengaluru", 12.9716, 77.5946),
    ("Hyderabad", 17.3850, 78.4867),
    ("Pune", 18.5204, 73.8567),
    ("Chennai", 13.0827, 80.2707),
    ("Mumbai", 19.0760, 72.8777),
    ("Gurugram", 28.4595, 77.0266),
    ("Noida", 28.5355, 77.3910),
    ("Ahmedabad", 23.0225, 72.5714),
    ("Kochi", 9.9312, 76.2673),
    ("Kolkata", 22.5726, 88.3639),
    ("Jaipur", 26.9124, 75.7873),
    ("New Delhi", 28.6139, 77.2090),
    ("Chandigarh", 30.7333, 76.7794),
    ("Coimbatore", 11.0168, 76.9558),
    ("Indore", 22.7196, 75.8577),
    ("Lucknow", 26.8467, 80.9462),
]

INDUSTRIES = [
    ("Technology Services", "Software engineering, IT services, and technology consulting."),
    ("Cloud and Cybersecurity", "Cloud platforms, infrastructure, identity, and security."),
    ("Financial Services", "Banking, insurance, payments, and financial operations."),
    ("Healthcare and Life Sciences", "Healthcare delivery, diagnostics, and life sciences."),
    ("Engineering and Manufacturing", "Industrial, automotive, electronics, and manufacturing."),
    ("Consumer Internet", "E-commerce, marketplaces, consumer apps, and digital media."),
    ("Logistics and Mobility", "Logistics, supply chain, mobility, and transportation."),
    ("Energy and Climate", "Renewable energy, utilities, climate, and sustainability."),
    ("Telecommunications", "Connectivity, telecom infrastructure, and communications."),
    ("Professional Services", "Consulting, legal, staffing, and business services."),
]

BRANDS = [
    "Asteron", "BluePeak", "CedarBridge", "Dawnridge", "Eastwood", "Fintara",
    "Greenline", "Harborview", "IndigoArc", "Juniper", "Kestrel", "Lattice",
    "Marigold", "Northstar", "Oakmont", "Pinnacle", "Quasar", "Riverstone",
    "Silveroak", "Trident",
]
DESCRIPTORS = [
    "Digital Labs", "Cloudworks", "Analytics Group", "Mobility Systems", "HealthTech",
]

CONTACT_FIRST_NAMES = [
    "Ananya", "Arjun", "Bhavna", "Dev", "Ishita", "Karan", "Meera", "Nikhil",
    "Pooja", "Rohan", "Sana", "Vikram", "Yash", "Zoya",
]
CONTACT_LAST_NAMES = [
    "Mehta", "Reddy", "Shah", "Iyer", "Kapoor", "Nair", "Bose", "Kulkarni",
    "Menon", "Sethi", "Patel", "Rao", "Bhat", "Chawla",
]
DESIGNATIONS = [
    "Head of Talent Acquisition", "Campus Hiring Lead", "University Relations Manager",
    "Engineering Recruitment Partner", "People Operations Director", "Early Careers Lead",
]

PIPELINE_STATUSES = [
    "prospect", "outreach", "in_talks", "discussion", "proposal_shared", "negotiation",
    "drive_scheduled", "drive_ongoing", "drive_completed", "offer_stage", "placed", "on_hold", "cancelled",
]
OUTLOOKS = ["positive", "neutral", "positive", "negative", "positive", "neutral"]
DRIVE_STATUSES = ["not_scheduled", "tentative", "scheduled", "completed", "cancelled", "scheduled"]
MEETING_TYPES = ["video_call", "in_person", "phone_call"]
MEETING_OUTCOMES = ["positive", "neutral", "follow_up_required"]
PRIORITIES = ["low", "medium", "high"]


def rows(table: str, columns: str = "*", limit: int = 10000) -> list[dict[str, Any]]:
    return db.table(table).select(columns).limit(limit).execute().data or []


def chunks(items: list[dict[str, Any]], size: int = 25) -> Iterable[list[dict[str, Any]]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def insert_many(table: str, payload: list[dict[str, Any]], size: int = 25) -> list[dict[str, Any]]:
    inserted: list[dict[str, Any]] = []
    for batch in chunks(payload, size):
        inserted.extend(db.table(table).insert(batch).execute().data or [])
    return inserted


def select_university(name: str | None, university_id: str | None) -> dict[str, Any]:
    universities = rows("universities", "id,name,status")
    if university_id:
        matches = [item for item in universities if str(item.get("id")) == university_id]
    else:
        wanted = (name or DEFAULT_UNIVERSITY).strip().casefold()
        matches = [item for item in universities if str(item.get("name", "")).strip().casefold() == wanted]
    if not matches:
        raise SystemExit("No matching university found. Use --university-id or --university-name.")
    return matches[0]


def ensure_industries(university_id: str, admin_id: str) -> list[dict[str, Any]]:
    existing = [item for item in rows("placement_industries") if str(item.get("university_id")) == university_id]
    by_name = {str(item.get("name", "")).strip().casefold(): item for item in existing}
    payload = []
    for name, description in INDUSTRIES:
        if name.casefold() not in by_name:
            payload.append({
                "university_id": university_id,
                "name": name,
                "description": description,
                "created_by": admin_id,
            })
    for item in insert_many("placement_industries", payload):
        by_name[str(item.get("name", "")).strip().casefold()] = item
    return sorted(by_name.values(), key=lambda item: str(item.get("name", "")))


def ensure_cities(university_id: str, admin_id: str) -> list[dict[str, Any]]:
    existing = [item for item in rows("university_cities") if str(item.get("university_id")) == university_id]
    by_name = {str(item.get("city", "")).strip().casefold(): item for item in existing}
    payload = [
        {"university_id": university_id, "city": city, "created_by": admin_id}
        for city, _, _ in CITY_DATA
        if city.casefold() not in by_name
    ]
    for item in insert_many("university_cities", payload):
        by_name[str(item.get("city", "")).strip().casefold()] = item
    return sorted(by_name.values(), key=lambda item: str(item.get("city", "")))


def ensure_categories(university_id: str, admin_id: str) -> list[dict[str, Any]]:
    existing = [item for item in rows("company_categories") if str(item.get("university_id")) == university_id]
    by_name = {str(item.get("name", "")).strip().casefold(): item for item in existing}
    additions = [
        ("E2E Growth", 3, 8, "Early-career and growth-stage hiring programs."),
        ("E2E Strategic", 8, 18, "Strategic engineering and business hiring programs."),
        ("E2E Premium", 18, 45, "Premium and specialist hiring programs."),
        ("E2E Global", 12, 30, "Global and distributed hiring programs."),
    ]
    payload = []
    for name, minimum, maximum, description in additions:
        if name.casefold() not in by_name:
            payload.append({
                "university_id": university_id,
                "name": name,
                "min_ctc_lpa": minimum,
                "max_ctc_lpa": maximum,
                "description": description,
                "created_by": admin_id,
            })
    for item in insert_many("company_categories", payload):
        by_name[str(item.get("name", "")).strip().casefold()] = item
    if len(by_name) < 4:
        raise SystemExit("The target university needs at least four company categories.")
    return sorted(by_name.values(), key=lambda item: str(item.get("name", "")))


def ensure_seasons(university_id: str, admin_id: str) -> list[dict[str, Any]]:
    existing = [item for item in rows("placement_seasons") if str(item.get("university_id")) == university_id]
    # Seasons are an existing placement-setup feature. Reuse the tenant's
    # first two configured cycles rather than creating additional UI cycles.
    return sorted(existing, key=lambda item: str(item.get("start_date", "")))[:2]


def ensure_assignments(university_id: str, admin_id: str, seasons: list[dict[str, Any]], people: list[dict[str, Any]]) -> int:
    existing = [item for item in rows("placement_assignments") if str(item.get("university_id")) == university_id]
    keys = {(str(item.get("season_id")), str(item.get("user_id"))) for item in existing}
    payload = []
    for season in seasons:
        for person in people:
            key = (str(season["id"]), str(person["id"]))
            if key not in keys:
                payload.append({
                    "university_id": university_id,
                    "season_id": season["id"],
                    "user_id": person["id"],
                    "assigned_by": admin_id,
                })
                keys.add(key)
    return len(insert_many("placement_assignments", payload))


def ensure_targets(university_id: str, admin_id: str, seasons: list[dict[str, Any]], categories: list[dict[str, Any]], managers: list[dict[str, Any]]) -> int:
    existing = [item for item in rows("placement_targets") if str(item.get("university_id")) == university_id]
    keys = {(str(item.get("season_id")), str(item.get("user_id")), str(item.get("category_id"))) for item in existing}
    payload = []
    for manager_index, manager in enumerate(managers):
        for season_index, season in enumerate(seasons):
            for category_index, category in enumerate(categories[:4]):
                key = (str(season["id"]), str(manager["id"]), str(category["id"]))
                if key in keys:
                    continue
                payload.append({
                    "university_id": university_id,
                    "season_id": season["id"],
                    "user_id": manager["id"],
                    "category_id": category["id"],
                    "companies_target": 5 + ((manager_index * 3 + season_index * 2 + category_index) % 8),
                    "created_by": admin_id,
                })
                keys.add(key)
    return len(insert_many("placement_targets", payload))


def company_specs(industries: list[dict[str, Any]], categories: list[dict[str, Any]], managers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    industry_by_name = {str(item.get("name")): item for item in industries}
    city_by_name = {city: (lat, lon) for city, lat, lon in CITY_DATA}
    specs = []
    for index in range(TARGET_COMPANY_COUNT):
        brand = BRANDS[index // len(DESCRIPTORS)]
        descriptor = DESCRIPTORS[index % len(DESCRIPTORS)]
        city = CITY_DATA[(index * 7 + index // 10) % len(CITY_DATA)][0]
        industry_name = INDUSTRIES[(index * 3 + index // 10) % len(INDUSTRIES)][0]
        category = categories[(index * 5 + index // 7) % len(categories)]
        manager = managers[index % len(managers)]
        lat, lon = city_by_name[city]
        status = ["active", "prospect", "active", "active", "inactive"][index % 5]
        ctc_min = 4 + ((index * 3) % 21)
        ctc_max = ctc_min + 4 + (index % 7)
        domain = f"{brand.lower()}{descriptor.replace(' ', '').lower()}{index + 1:03d}.example.com"
        specs.append({
            "index": index + 1,
            "name": f"{brand} {descriptor}",
            "industry": industry_name,
            "industry_id": industry_by_name[industry_name]["id"],
            "city": city,
            "lat": lat,
            "lon": lon,
            "category_id": category["id"],
            "manager_id": manager["id"],
            "expected_ctc": f"{ctc_min}-{ctc_max} LPA",
            "website": f"https://{domain}",
            "status": status,
            "notes": f"{SEED_MARKER} | company_index:{index + 1:03d} | HQ coordinates: {lat:.4f}, {lon:.4f} | Synthetic but scenario-shaped employer record.",
        })
    return specs


def ensure_organizations(university_id: str, specs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing = [item for item in rows("organizations") if str(item.get("university_id")) == university_id]
    by_index = {}
    for item in existing:
        notes = str(item.get("notes", ""))
        if SEED_MARKER in notes and "company_index:" in notes:
            marker = notes.split("company_index:", 1)[1].split("|", 1)[0].strip()
            by_index[marker] = item
    payload = []
    for spec in specs:
        key = f"{spec['index']:03d}"
        if key in by_index:
            continue
        payload.append({
            "university_id": university_id,
            "placement_manager_id": spec["manager_id"],
            "name": spec["name"],
            "category_id": spec["category_id"],
            "expected_ctc": spec["expected_ctc"],
            "industry_id": spec["industry_id"],
            "industry": spec["industry"],
            "website": spec["website"],
            "city": spec["city"],
            "status": spec["status"],
            "relationship_type": "company",
            "notes": spec["notes"],
        })
    inserted = insert_many("organizations", payload)
    for item in inserted:
        notes = str(item.get("notes", ""))
        marker = notes.split("company_index:", 1)[1].split("|", 1)[0].strip()
        by_index[marker] = item
    if len(by_index) < TARGET_COMPANY_COUNT:
        raise SystemExit(f"Only {len(by_index)} synthetic organizations are available; expected {TARGET_COMPANY_COUNT}.")
    return [by_index[f"{index:03d}"] for index in range(1, TARGET_COMPANY_COUNT + 1)]


def metric_values(index: int, season_index: int) -> dict[str, Any]:
    stage = PIPELINE_STATUSES[(index - 1 + season_index * 3) % len(PIPELINE_STATUSES)]
    today = date.today()
    registered = 18 + ((index * 11 + season_index * 17) % 125)
    if stage in {"prospect", "outreach"}:
        selected = max(0, registered // 5)
    elif stage in {"cancelled", "on_hold"}:
        selected = max(0, registered // 3)
    else:
        selected = max(1, round(registered * (0.32 + ((index + season_index) % 5) * 0.08)))
    selected = min(registered, selected)
    offers = (selected // 5) if stage not in {"prospect", "outreach", "in_talks", "discussion", "cancelled"} else 0
    placed = max(0, offers - (index % 3 if stage == "placed" else 0))
    drive_status = {
        "prospect": "not_scheduled", "outreach": "not_scheduled", "in_talks": "tentative",
        "discussion": "tentative", "proposal_shared": "scheduled", "negotiation": "scheduled",
        "drive_scheduled": "scheduled", "drive_ongoing": "scheduled", "drive_completed": "completed", "offer_stage": "completed",
        "placed": "completed", "joined": "completed", "on_hold": "cancelled", "cancelled": "cancelled",
    }[stage]
    expected_date = today + timedelta(days=((index * 13 + season_index * 19) % 151) - 70)
    follow_up = today + timedelta(days=((index * 7 + season_index * 11) % 43) - 18)
    last_contact = today - timedelta(days=((index * 5 + season_index * 3) % 46))
    next_action = None if index % 11 == 0 else (
        "Confirm interview panel and student shortlist" if stage != "cancelled"
        else "Share closure notes and alumni conversion update"
    )
    notes = None if index % 11 == 0 else f"{SEED_MARKER} | scenario metric for company {index:03d}, cycle {season_index + 1}."
    return {
        "companies_acquired": 0 if stage in {"prospect", "cancelled"} else 1,
        "drives_conducted": 1 if stage in {"drive_completed", "offer_stage", "placed"} else 0,
        "offers_received": offers,
        "students_placed": placed,
        "pipeline_status": stage,
        "outlook": OUTLOOKS[(index + season_index) % len(OUTLOOKS)],
        "expected_date": expected_date.isoformat(),
        "drive_date": (today - timedelta(days=(index % 35) + 1)).isoformat() if drive_status == "completed" else None,
        "last_contact_date": last_contact.isoformat(),
        "next_follow_up_date": follow_up.isoformat() if index % 17 != 0 else None,
        "drive_status": drive_status,
        "company_probability": min(95, 18 + ((index * 9 + season_index * 13) % 78)),
        "students_registered": registered,
        "students_selected": selected,
        "students_rejected": registered - selected,
        "next_action": next_action,
        "notes": notes,
    }


def ensure_metrics(university_id: str, seasons: list[dict[str, Any]], organizations: list[dict[str, Any]]) -> int:
    existing = [item for item in rows("placement_metrics") if str(item.get("university_id")) == university_id]
    keys = {(str(item.get("season_id")), str(item.get("organization_id")), str(item.get("placement_manager_id"))) for item in existing}
    payload = []
    for index, organization in enumerate(organizations, start=1):
        for season_index, season in enumerate(seasons):
            key = (str(season["id"]), str(organization["id"]), str(organization["placement_manager_id"]))
            if key in keys:
                continue
            payload.append({
                "university_id": university_id,
                "season_id": season["id"],
                "organization_id": organization["id"],
                "placement_manager_id": organization["placement_manager_id"],
                "category_id": organization.get("category_id"),
                **metric_values(index, season_index),
                "updated_by": organization["placement_manager_id"],
            })
            keys.add(key)
    return len(insert_many("placement_metrics", payload))


def ensure_contacts(organizations: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    org_ids = {str(item["id"]) for item in organizations}
    existing = [item for item in rows("contacts") if str(item.get("organization_id")) in org_ids]
    existing_keys = {str(item.get("notes", "")).split("contact_index:", 1)[-1].split("|", 1)[0].strip() for item in existing if "contact_index:" in str(item.get("notes", ""))}
    payload = []
    contact_number = 0
    for company_index, organization in enumerate(organizations, start=1):
        contact_count = 2 if company_index % 4 == 0 else 1
        for contact_index in range(contact_count):
            contact_number += 1
            marker = f"{company_index:03d}-{contact_index + 1}"
            if marker in existing_keys:
                continue
            first = CONTACT_FIRST_NAMES[(contact_number * 3) % len(CONTACT_FIRST_NAMES)]
            last = CONTACT_LAST_NAMES[(contact_number * 5) % len(CONTACT_LAST_NAMES)]
            slug = f"{first.lower()}.{last.lower()}.{company_index:03d}.{contact_index + 1}"
            preferred_channel = "video" if contact_number % 3 == 0 else "phone" if contact_number % 3 == 1 else "email"
            payload.append({
                "organization_id": organization["id"],
                "placement_manager_id": organization["placement_manager_id"],
                "name": f"{first} {last}",
                "designation": DESIGNATIONS[(contact_number + contact_index) % len(DESIGNATIONS)],
                "email": f"{slug}@talent-partners.example.com",
                "phone": f"+91 {70000 + (contact_number * 137) % 9999:05d} {10000 + contact_number:05d}",
                "linkedin_url": f"https://www.linkedin.com/in/{slug.replace('.', '-')}",
                "notes": f"{SEED_MARKER} | contact_index:{marker} | Prefers {preferred_channel} for first response.",
            })
    inserted = insert_many("contacts", payload)
    all_contacts = [item for item in rows("contacts") if str(item.get("organization_id")) in org_ids]
    return all_contacts, len(inserted)


def ensure_reports(organizations: list[dict[str, Any]], contacts: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int, int]:
    contacts_by_org: dict[str, list[dict[str, Any]]] = {}
    for contact in contacts:
        contacts_by_org.setdefault(str(contact["organization_id"]), []).append(contact)
    org_ids = {str(item["id"]) for item in organizations}
    existing = [item for item in rows("meeting_reports") if str(item.get("organization_id")) in org_ids and SEED_MARKER in str(item.get("summary", ""))]
    existing_markers = {str(item.get("summary", "")).split("report_index:", 1)[-1].split("|", 1)[0].strip() for item in existing if "report_index:" in str(item.get("summary", ""))}
    payload = []
    report_number = 0
    for company_index, organization in enumerate(organizations, start=1):
        report_count = 2 if company_index % 5 == 0 else 1
        org_contacts = contacts_by_org.get(str(organization["id"])) or []
        for occurrence in range(report_count):
            report_number += 1
            marker = f"{company_index:03d}-{occurrence + 1}"
            if marker in existing_markers or not org_contacts:
                continue
            meeting_date = date.today() - timedelta(days=(company_index * 3 + occurrence * 9) % 120)
            payload.append({
                "placement_manager_id": organization["placement_manager_id"],
                "organization_id": organization["id"],
                "contact_id": org_contacts[occurrence % len(org_contacts)]["id"],
                "meeting_date": meeting_date.isoformat(),
                "title": f"{organization['name']} hiring review {occurrence + 1}",
                "summary": f"{SEED_MARKER} | report_index:{marker} | Reviewed hiring volume, role mix, drive readiness, and expected decision timeline.",
                "action_items": "Confirm student shortlist\nShare drive calendar\nCapture compensation approval" if occurrence % 2 else "Confirm student shortlist\nShare drive calendar",
                "attendees": "Talent Acquisition, Placement Team, Faculty Coordinator",
                "outcome": MEETING_OUTCOMES[(company_index + occurrence) % len(MEETING_OUTCOMES)],
                "follow_up_date": (meeting_date + timedelta(days=5 + (company_index % 9))).isoformat(),
                "meeting_type": MEETING_TYPES[(company_index + occurrence) % len(MEETING_TYPES)],
            })
    inserted = insert_many("meeting_reports", payload)
    all_reports = [item for item in rows("meeting_reports") if str(item.get("organization_id")) in org_ids and SEED_MARKER in str(item.get("summary", ""))]
    existing_action_reports = {str(item.get("meeting_report_id")) for item in rows("meeting_action_items") if str(item.get("meeting_report_id")) in {str(report["id"]) for report in all_reports}}
    action_payload = []
    for report_index, report in enumerate(all_reports):
        if str(report["id"]) in existing_action_reports:
            continue
        action_payload.extend([
            {"meeting_report_id": report["id"], "placement_manager_id": report["placement_manager_id"], "text": "Confirm student shortlist", "is_completed": report_index % 4 == 0, "position": 0},
            {"meeting_report_id": report["id"], "placement_manager_id": report["placement_manager_id"], "text": "Share drive calendar", "is_completed": report_index % 5 == 0, "position": 1},
        ])
        if report_index % 2 == 0:
            action_payload.append({"meeting_report_id": report["id"], "placement_manager_id": report["placement_manager_id"], "text": "Capture compensation approval", "is_completed": False, "position": 2})
    actions_created = len(insert_many("meeting_action_items", action_payload))
    return all_reports, len(inserted), actions_created


def ensure_kanban(organizations: list[dict[str, Any]], managers: list[dict[str, Any]]) -> tuple[int, int]:
    stage_templates = [
        ("Prospecting", "#64748b", 0, 30),
        ("Meeting Scheduled", "#2563eb", 1, 20),
        ("Proposal Sent", "#f59e0b", 2, 15),
        ("Closed Won", "#10b981", 3, None),
        ("Closed Lost", "#ef4444", 4, None),
    ]
    existing_stages = rows("kanban_stages")
    stage_by_manager_name = {(str(item.get("placement_manager_id")), str(item.get("name"))): item for item in existing_stages}
    stage_payload = []
    for manager in managers:
        for name, color, position, wip_limit in stage_templates:
            full_name = f"E2E {name}"
            key = (str(manager["id"]), full_name)
            if key not in stage_by_manager_name:
                stage_payload.append({"placement_manager_id": manager["id"], "name": full_name, "color": color, "position": position, "wip_limit": wip_limit})
    inserted_stages = insert_many("kanban_stages", stage_payload)
    for item in inserted_stages:
        stage_by_manager_name[(str(item.get("placement_manager_id")), str(item.get("name")))] = item
    stage_map = {}
    for manager in managers:
        stage_map[str(manager["id"])] = {
            "prospect": stage_by_manager_name[(str(manager["id"]), "E2E Prospecting")],
            "meeting": stage_by_manager_name[(str(manager["id"]), "E2E Meeting Scheduled")],
            "proposal": stage_by_manager_name[(str(manager["id"]), "E2E Proposal Sent")],
            "won": stage_by_manager_name[(str(manager["id"]), "E2E Closed Won")],
            "lost": stage_by_manager_name[(str(manager["id"]), "E2E Closed Lost")],
        }
    existing_cards = rows("kanban_cards")
    existing_markers = {str(item.get("description", "")).split("card_index:", 1)[-1].split("|", 1)[0].strip() for item in existing_cards if "card_index:" in str(item.get("description", ""))}
    cards = []
    for index, organization in enumerate(organizations, start=1):
        marker = f"{index:03d}"
        if marker in existing_markers:
            continue
        status = PIPELINE_STATUSES[(index - 1) % len(PIPELINE_STATUSES)]
        group = "won" if status == "placed" else "lost" if status == "cancelled" else "proposal" if status in {"proposal_shared", "negotiation", "drive_scheduled", "drive_ongoing", "drive_completed", "offer_stage"} else "meeting" if status in {"in_talks", "discussion"} else "prospect"
        stage = stage_map[str(organization["placement_manager_id"])][group]
        cards.append({
            "stage_id": stage["id"],
            "placement_manager_id": organization["placement_manager_id"],
            "organization_id": organization["id"],
            "title": f"{organization['name']} · campus hiring",
            "description": f"{SEED_MARKER} | card_index:{marker} | Coordinate hiring panel, candidate readiness, and next decision gate.",
            "priority": PRIORITIES[index % len(PRIORITIES)],
            "due_date": (date.today() + timedelta(days=(index % 40) - 15)).isoformat(),
            "position": index,
            "completed_at": (date.today() - timedelta(days=index % 20)).isoformat() + "T10:00:00+00:00" if group in {"won", "lost"} else None,
        })
    return len(inserted_stages), len(insert_many("kanban_cards", cards))


def ensure_approval_fixtures(university_id: str, managers: list[dict[str, Any]], organizations: list[dict[str, Any]], contacts: list[dict[str, Any]]) -> tuple[int, int]:
    manager = managers[0]
    organization = organizations[0]
    requested_organization = organizations[1]
    contact = next(item for item in contacts if str(item.get("organization_id")) == str(organization["id"]))
    duplicate_company_rows = rows("duplicate_company_requests")
    company_exists = any(SEED_MARKER in str(item.get("requested_payload", {})) for item in duplicate_company_rows)
    company_created = 0
    if not company_exists:
        db.table("duplicate_company_requests").insert({
            "university_id": university_id,
            "requested_by": manager["id"],
            "existing_organization_id": organization["id"],
            "requested_name": f"{organization['name']} - alternate acquisition",
            "requested_payload": {"seed_marker": SEED_MARKER, "name": f"{organization['name']} - alternate acquisition", "reason": "Potential duplicate from a second outreach channel."},
            "status": "pending",
        }).execute()
        company_created = 1
    contact_request_rows = rows("duplicate_contact_requests")
    contact_exists = any(SEED_MARKER in str(item.get("requested_payload", {})) for item in contact_request_rows)
    contact_created = 0
    if not contact_exists:
        db.table("duplicate_contact_requests").insert({
            "university_id": university_id,
            "requested_by": requested_organization["placement_manager_id"],
            "existing_contact_id": contact["id"],
            "existing_organization_id": organization["id"],
            "requested_organization_id": requested_organization["id"],
            "requested_name": contact["name"],
            "requested_payload": {
                "seed_marker": SEED_MARKER,
                "name": contact["name"],
                "designation": "Regional University Relations Partner",
                "email": f"duplicate.review.{contact['id']}@talent-partners.example.com",
                "phone": "+91 79999 12345",
                "linkedin_url": contact.get("linkedin_url"),
                "notes": "Synthetic pending duplicate-contact review fixture.",
            },
            "status": "pending",
        }).execute()
        contact_created = 1
    return company_created, contact_created


def ensure_observability(university_id: str, admin_id: str, managers: list[dict[str, Any]]) -> tuple[int, int]:
    audit_created = 0
    notification_created = 0
    audit_rows = rows("audit_events")
    if not any(SEED_MARKER in str(item.get("summary", {})) for item in audit_rows):
        db.table("audit_events").insert({
            "actor_id": admin_id,
            "university_id": university_id,
            "action": "seeded",
            "entity_type": "e2e_dataset",
            "entity_id": SEED_MARKER,
            "summary": {"seed_marker": SEED_MARKER, "organization_count": TARGET_COMPANY_COUNT, "purpose": "End-to-end validation fixture"},
        }).execute()
        audit_created = 1
    notification_rows = rows("notifications")
    for index, manager in enumerate(managers):
        if any(SEED_MARKER in str(item.get("message", "")) and str(item.get("user_id")) == str(manager["id"]) for item in notification_rows):
            continue
        db.table("notifications").insert({
            "user_id": manager["id"],
            "university_id": university_id,
            "type": "e2e_seed_ready",
            "title": "Synthetic CRM dataset ready",
            "message": f"{SEED_MARKER}: review the seeded placement records, reports, and Kanban work items.",
            "entity_type": "e2e_dataset",
            "entity_id": SEED_MARKER,
            "href": "Placement Analytics",
            "is_read": index % 2 == 0,
            "read_at": date.today().isoformat() + "T09:00:00+00:00" if index % 2 == 0 else None,
        }).execute()
        notification_created += 1
    return audit_created, notification_created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed 100 synthetic CRM companies across two placement cycles.")
    parser.add_argument("--university-id", help="Target university UUID.")
    parser.add_argument("--university-name", default=DEFAULT_UNIVERSITY, help=f"Target university name (default: {DEFAULT_UNIVERSITY}).")
    args = parser.parse_args()

    university = select_university(args.university_name, args.university_id)
    university_id = str(university["id"])
    profiles = [item for item in rows("profiles") if str(item.get("university_id")) == university_id]
    admins = [item for item in profiles if item.get("role") == "university_admin" and item.get("status") == "active"]
    managers = [item for item in profiles if item.get("role") == "placement_manager" and item.get("status") == "active"]
    coordinators = [item for item in profiles if item.get("role") == "coordinator" and item.get("status") == "active"]
    if not admins or not managers:
        raise SystemExit("The target university needs an active university admin and placement manager first.")
    admin_id = str(admins[0]["id"])
    industries = ensure_industries(university_id, admin_id)
    cities = ensure_cities(university_id, admin_id)
    categories = ensure_categories(university_id, admin_id)
    seasons = ensure_seasons(university_id, admin_id)
    if len(seasons) < 2:
        raise SystemExit("The target university needs two placement seasons for this seed.")
    assigned = ensure_assignments(university_id, admin_id, seasons, [*coordinators, *managers])
    targets = ensure_targets(university_id, admin_id, seasons, categories, managers)
    specs = company_specs(industries, categories, managers)
    organizations = ensure_organizations(university_id, specs)
    metrics = ensure_metrics(university_id, seasons, organizations)
    contacts, contacts_created = ensure_contacts(organizations)
    reports, reports_created, actions_created = ensure_reports(organizations, contacts)
    stages_created, cards_created = ensure_kanban(organizations, managers)
    duplicate_company_created, duplicate_contact_created = ensure_approval_fixtures(university_id, managers, organizations, contacts)
    audit_created, notifications_created = ensure_observability(university_id, admin_id, managers)
    print({
        "university": university.get("name"),
        "seed_marker": SEED_MARKER,
        "synthetic_organizations": len(organizations),
        "seasons_used": len(seasons),
        "industries_available": len(industries),
        "cities_available": len(cities),
        "categories_available": len(categories),
        "assignments_created": assigned,
        "targets_created": targets,
        "metrics_created": metrics,
        "contacts_total_for_seed": len(contacts),
        "contacts_created": contacts_created,
        "reports_total_for_seed": len(reports),
        "reports_created": reports_created,
        "action_items_created": actions_created,
        "kanban_stages_created": stages_created,
        "kanban_cards_created": cards_created,
        "duplicate_company_requests_created": duplicate_company_created,
        "duplicate_contact_requests_created": duplicate_contact_created,
        "audit_events_created": audit_created,
        "notifications_created": notifications_created,
    })


if __name__ == "__main__":
    main()
