# Placement workflow redesign

## Understanding summary

- University admins need an active attention queue for approvals and other important pending work.
- A notification is actionable: opening it marks it reviewed and routes to the correct workspace section.
- Placement managers own company relationships, while coordinators maintain operational placement metrics and may correct PM-entered company registration details.
- Every company has one shared placement metric per season and placement manager; the same record powers analytics.
- Coordinators need a company-level edit drawer instead of a dense, context-poor form.
- Placement managers need read-only visibility into their companies' tracker records and a review action.
- Companies without a coordinator update still appear as `Not started`, so the handoff cannot be missed.
- A manager can approve an update or request changes with a note; the coordinator sees that feedback and can resubmit.

## Assumptions

- The current FastAPI + Supabase service is the source of truth.
- Existing company, season, category, and access-control rules remain unchanged.
- A coordinator can edit the registration fields for companies included in their organization access; the PM remains the relationship owner.
- A coordinator save submits the record for manager review automatically.
- Existing placement records are treated as approved when the review migration is first applied.
- Notifications are kept in the existing server-only notifications table and use existing `href` values for navigation.

## Decision log

1. Use a review state on `placement_metrics` (`approved`, `pending`, `changes_requested`) instead of a separate review table. This keeps analytics, editing, and review tied to one company record and avoids synchronization bugs.
2. Use a modal edit drawer for the operational update. PM-owned company fields remain locked context while pipeline, drive, dates, outcomes, and next action are editable.
3. Add a dedicated Placement Tracker nav item for placement managers. Their tracker is read-only, scoped to their own companies, and includes Approve / Request changes actions.
4. Generate idempotent admin notifications for pending duplicate approvals and pending placement updates. Read/reviewed notifications remain dismissed until a new event is created.

## Workflow

`PM registers company + category/CTC/details → coordinator sees that exact company → coordinator can correct registration details and/or edit operational fields → metric becomes Pending review → placement manager receives a deep-linked notification → manager approves or requests changes → coordinator receives feedback → coordinator edits and resubmits → analytics reflects the saved metric.`
