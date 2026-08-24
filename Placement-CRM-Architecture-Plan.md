# Placement Management CRM — Full Project Plan & Architecture

## 0. Scope & Assumptions

You described two roles and a 4-panel PM workspace. Before diving in, here's how I've interpreted it — adjust anything that doesn't match your intent:

- **Admin** manages the roster of **Placement Managers (PMs)** — add, remove/deactivate — and has **no visibility into their data** (organizations, contacts, meeting reports, or Kanban board).
- **Placement Manager** gets a private workspace with four sections:
  1. **Organizations** — companies/institutions they're building a placement relationship with.
  2. **Contacts** — people at those organizations (HR/hiring managers etc.) they're in touch with.
  3. **Meeting Reports** — free-text logs of meetings they've had.
  4. **Kanban** — a pipeline board to track where each organization/deal stands (e.g. Prospecting → Contacted → Meeting Scheduled → Proposal Sent → Closed Won/Lost). This is the one part that was slightly open-ended in your description, so I've designed it as a **configurable pipeline board** tied to organizations — easy to rename stages if your actual use case differs.
- Each PM's data is **strictly private to them** — no other PM, and not even the Admin, can read it. This isolation is enforced at the database level (Postgres Row Level Security), not just hidden in the UI, so it holds no matter what the frontend does.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite** | As requested — fast dev server, no framework lock-in like Next.js |
| Styling/UI | **Tailwind CSS + shadcn/ui** | Gives you production-looking dashboard components (tables, dialogs, dropdowns, cards) fast, fully customizable since it's copy-in code, not a black-box library |
| Routing | **React Router v6** | Standard SPA routing, protected routes |
| Server state | **TanStack Query (React Query)** | Caching, refetching, optimistic updates for all Supabase reads/writes |
| Forms | **React Hook Form + Zod** | Validation with minimal boilerplate |
| Drag-and-drop (Kanban) | **dnd-kit** | Actively maintained (react-beautiful-dnd is deprecated), accessible, works well with React 18 |
| Backend | **Supabase** (Postgres + Auth + Row Level Security + Realtime + Edge Functions + Storage) | You already specified this — no separate custom backend server needed |
| Charts (optional, admin overview) | **Recharts** | Lightweight, pairs well with shadcn |
| Icons | **lucide-react** | Matches shadcn's default icon set |

This is a natural continuation of the React/Vite dashboard work you've done before (e.g. SENTINEL-AI) — same shape, new domain.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React + Vite SPA                       │
│  ┌───────────────┐        ┌────────────────────────────┐   │
│  │ Admin Views   │        │ Placement Manager Views     │   │
│  │ - PM roster   │        │ - Organizations             │   │
│  │ - Roster stats│        │ - Contacts                  │   │
│  └───────┬───────┘        │ - Meeting Reports            │   │
│          │                │ - Kanban Board               │   │
│          │                └──────────┬───────────────────┘   │
│          └───────────────┬───────────┘                       │
│                  Auth Context + Protected Routes              │
│                  TanStack Query (data layer)                  │
└───────────────────────────┬────────────────────────────────┘
                             │  supabase-js (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         Supabase                              │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Postgres  │  │ Auth (JWT)   │  │ Row Level Security  │    │
│  │ (tables)  │  │              │  │ (no admin bypass)   │    │
│  └───────────┘  └──────────────┘  └────────────────────┘    │
│  ┌───────────┐  ┌──────────────┐                             │
│  │ Realtime  │  │ Edge Function│  (used only for admin       │
│  │ (kanban   │  │ invite-pm    │   actions needing the       │
│  │  sync)    │  │              │   service_role key)         │
│  └───────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

Key architectural decision: **no custom backend server**. The React app talks to Supabase directly via `supabase-js`, and per-row security is enforced entirely by **Row Level Security (RLS) policies** in Postgres. The only place you need actual server-side code is a small **Edge Function** for admin actions like creating a new PM's login (since that requires the Supabase service-role key, which must never sit in frontend code).

The Admin's "Roster stats" box only ever queries `profiles` — there is no code path, and no RLS policy, that lets an admin session read `organizations`, `contacts`, `meeting_reports`, `kanban_stages`, or `kanban_cards`. See the Security Model in Section 3 for how this is enforced (and how to verify it).

---

## 3. Database Schema (Postgres via Supabase)

### `profiles`
Extends Supabase's built-in `auth.users` with role info.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | = `auth.users.id` |
| full_name | text | |
| email | text | |
| role | text | `'admin'` \| `'placement_manager'` |
| status | text | `'active'` \| `'inactive'`, default `'active'` |
| created_at | timestamptz | default `now()` |

### `organizations`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| placement_manager_id | uuid, FK → profiles.id | owner |
| name | text | required |
| industry | text | |
| website | text | |
| city | text | |
| status | text | `'prospect'` \| `'active'` \| `'inactive'` |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `contacts`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| organization_id | uuid, FK → organizations.id | on delete cascade |
| placement_manager_id | uuid, FK → profiles.id | owner (denormalized for simpler RLS) |
| name | text | required |
| designation | text | e.g. "HR Manager" |
| email | text | |
| phone | text | |
| linkedin_url | text | |
| notes | text | |
| created_at | timestamptz | |

### `meeting_reports`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| placement_manager_id | uuid, FK → profiles.id | owner |
| organization_id | uuid, FK → organizations.id, nullable | |
| contact_id | uuid, FK → contacts.id, nullable | |
| meeting_date | date | required |
| title | text | |
| summary | text | the actual report body |
| action_items | text | |
| attendees | text | |
| created_at | timestamptz | |

### `kanban_stages`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| placement_manager_id | uuid, FK → profiles.id | each PM has their own board/stages |
| name | text | e.g. "Prospecting", "Contacted", "Closed Won" |
| position | int | column order |
| color | text | for the UI badge/column header |

### `kanban_cards`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| stage_id | uuid, FK → kanban_stages.id | on delete cascade |
| placement_manager_id | uuid, FK → profiles.id | denormalized owner |
| organization_id | uuid, FK → organizations.id, nullable | link card to an org |
| title | text | |
| description | text | |
| priority | text | `'low'` \| `'medium'` \| `'high'` |
| due_date | date | |
| position | int | order within the column |
| created_at / updated_at | timestamptz | |

**Relationships:** one PM → many organizations → many contacts; one PM → many meeting reports (each optionally tagged to an org/contact); one PM → many kanban stages → many kanban cards (each optionally linked to an org).

### Row Level Security (strict PM isolation — admin included)

Enable RLS on every table above, then apply this **single** policy pattern (shown for `organizations`, identical shape for `contacts`, `meeting_reports`, `kanban_stages`, `kanban_cards`):

```sql
alter table organizations enable row level security;

-- The ONLY policy on this table. Nothing else reads, writes, or bypasses it.
create policy "pm_owns_organizations"
on organizations for all
using (placement_manager_id = auth.uid())
with check (placement_manager_id = auth.uid());
```

Repeat this exact pattern for the other four tables, swapping the owner column reference where needed. **No admin-read policy is created on any of these five tables — deliberately.** That's what actually gives you the "no data leakage" guarantee, not a UI-level restriction.

### Security model — why this is provably leak-proof

Postgres RLS is **default-deny**: the instant `enable row level security` runs on a table, *every* query against it returns zero rows unless a policy explicitly grants access. That gives three separate guarantees here:

1. **PM ↔ PM isolation.** The only policy anywhere on these five tables checks `placement_manager_id = auth.uid()`. `auth.uid()` is read from the verified JWT by Postgres itself — it isn't a value the client sends — so PM A cannot see PM B's rows by editing a request, changing an ID in the URL, or any frontend trick. The row just won't match at the database layer, full stop.
2. **Admin ↔ PM isolation.** There is no policy of any kind granting the admin role access to `organizations`, `contacts`, `meeting_reports`, `kanban_stages`, or `kanban_cards`. If an admin session queries any of them directly, RLS returns zero rows / permission denied — not "the UI doesn't show a button," but "the database refuses the query."
3. **No service-role leakage.** The admin's only elevated capability is the `invite-placement-manager` Edge Function, which uses the `service_role` key strictly to create/ban `auth.users` and write to `profiles`. That key lives only in the Edge Function's server environment — it is never sent to the browser — so there's no way for a client-side bug or a curious admin to use it to read PM data either.

**How to verify this before you consider it done** (do this — don't just trust the policy file): in Supabase Studio, generate/impersonate a JWT for PM A, PM B, and the Admin, and run `select * from organizations` (and the other four tables) as each. Expected result: PM A sees only their own rows, PM B sees only theirs (zero of A's), and Admin gets zero rows on all five tables. That test is your actual proof of isolation, not the SQL file by itself.

---

## 4. Authentication & Role Routing

- **Login:** Supabase Auth (email + password, or magic link — either works).
- **Admin creates a PM:** the frontend calls a Supabase **Edge Function** (`invite-placement-manager`), because creating an auth user requires the `service_role` key, which must stay server-side. The function:
  1. Verifies the caller's JWT has `role = 'admin'`.
  2. Calls `supabase.auth.admin.inviteUserByEmail(email)`.
  3. Inserts a row into `profiles` with `role = 'placement_manager'`.
- **Admin removes a PM:** prefer a **soft delete** — set `status = 'inactive'` on `profiles` (and optionally ban the auth user via `auth.admin.updateUserById(id, { ban_duration: '876000h' })`) rather than hard-deleting, so historical organizations/contacts/reports aren't orphaned.
- **Frontend routing:** after login, read `profiles.role` and redirect — `/admin/*` for admins, `/app/*` for PMs. A `<ProtectedRoute role="admin">` wrapper component checks both "is logged in" and "has the right role" before rendering.

---

## 5. Admin Dashboard

**Layout:** sidebar (Overview, Placement Managers, Settings) + top bar (avatar, logout).

Everything on the Admin side reads from `profiles` only — never from a PM's organizations, contacts, meeting reports, or Kanban data. There's no view, page, or query anywhere in this design that lets the admin see what a PM is working on.

- **Overview page:** stat cards — Total PMs, Active PMs, Inactive PMs, PMs added this month — and, if you want a visual, a simple line chart (Recharts) of PM sign-ups over time. That's the ceiling of what Admin ever sees.
- **Placement Managers page:** a table — Name, Email, Status, Joined date, Actions (Edit / Deactivate / Remove). A "+ Add Placement Manager" button opens a dialog (Name, Email) that triggers the invite Edge Function.
- **No drill-down, by design.** There is intentionally no way to open a PM's organizations, contacts, reports, or Kanban board from the admin side — this isn't just left out of the UI, the RLS policies in Section 3 make it impossible to fetch even if someone tried.

---

## 6. Placement Manager Dashboard

**Layout:** sidebar with the four sections (Overview, Organizations, Contacts, Meeting Reports, Kanban) + top bar.

### 6.1 Organizations
- Table/grid view with search and filter by `status`/`industry`.
- "+ Add Organization" form: Name, Industry, Website, City, Status, Notes.
- Clicking a row opens a detail drawer showing that org's linked Contacts and Meeting Reports, plus Edit/Delete.

### 6.2 Contacts
- Table with search + filter by organization.
- "+ Add Contact" form: select Organization (dropdown), Name, Designation, Email, Phone, LinkedIn.
- Columns: Name, Designation, Organization, Email, Phone.

### 6.3 Meeting Reports
- Reverse-chronological list of report cards: date, title, tagged org/contact, summary preview.
- "+ New Report" form: Organization (optional), Contact (optional), Date, Title, Summary, Action Items, Attendees.
- Click a card to expand the full report inline or in a dialog.

### 6.4 Kanban
- Trello-style board. Default stages: **Prospecting → Contacted → Meeting Scheduled → Proposal Sent → Closed Won / Closed Lost** — but stages are just rows in `kanban_stages`, so the PM can rename/add/remove columns.
- Cards represent an organization moving through the pipeline (optionally linked to an `organization_id`).
- Drag-and-drop (dnd-kit) between columns updates `stage_id` and `position` in the DB; **Supabase Realtime** keeps it in sync if the PM has the board open on two devices.
- Click a card for a detail modal: linked org, notes, due date, priority.
- "+ Add Card" per column, "+ Add Stage" to customize the pipeline.

---

## 7. Frontend Project Structure

```
src/
  main.jsx
  App.jsx
  lib/
    supabaseClient.js        # createClient(url, anonKey)
  context/
    AuthContext.jsx          # session + profile (role) state
  hooks/
    useOrganizations.js      # React Query hooks per table
    useContacts.js
    useMeetingReports.js
    useKanban.js
    usePlacementManagers.js  # admin-only
  components/
    ui/                      # shadcn components (button, table, dialog, card, badge...)
    layout/
      Sidebar.jsx
      Topbar.jsx
    admin/
      PlacementManagerTable.jsx
      AddPMDialog.jsx
      AdminOverviewStats.jsx
    pm/
      OrganizationsTable.jsx
      OrganizationDrawer.jsx
      ContactsTable.jsx
      MeetingReportList.jsx
      MeetingReportForm.jsx
      KanbanBoard.jsx
      KanbanColumn.jsx
      KanbanCard.jsx
  pages/
    Login.jsx
    AdminOverview.jsx
    AdminPlacementManagers.jsx
    PMOverview.jsx
    PMOrganizations.jsx
    PMContacts.jsx
    PMMeetingReports.jsx
    PMKanban.jsx
  routes/
    ProtectedRoute.jsx
  index.css                  # Tailwind directives
supabase/
  migrations/                # SQL schema + RLS policies, versioned
  functions/
    invite-placement-manager/
      index.ts
```

---

## 8. UI/UX Direction

- **Sidebar navigation**, dark or light neutral (slate/zinc), single accent color (indigo or teal) for primary actions and active nav state.
- **Stat cards** at the top of both dashboards — quick-glance numbers before the tables.
- **Status colors:** green = active/won, amber = in-progress/prospect, red = inactive/lost — used consistently across Organizations, PM status, and Kanban.
- **Tables** (shadcn `Table` + your own search input) for Organizations/Contacts/PM roster — sortable columns are a nice-to-have, not required for MVP.
- **Kanban columns** styled like Trello/Linear: column header with name + card count, cards as compact shadcn `Card` components with a colored priority tag.
- **Meeting reports** as a simple card list rather than a table — reports are read as prose, not scanned like data rows.

---

## 9. Suggested Build Order (roughly 6–8 sessions)

1. Vite + React scaffold, Tailwind, shadcn init, Supabase project setup.
2. Write schema migrations + RLS policies; verify with test rows in Supabase Studio.
3. Auth pages + `AuthContext` + role-based protected routing.
4. Admin: PM roster table + invite Edge Function + deactivate action.
5. PM: Organizations CRUD (table + form + drawer).
6. PM: Contacts CRUD (linked to organizations).
7. PM: Meeting Reports CRUD.
8. PM: Kanban board (stages + cards + dnd-kit + Realtime sync).
9. Polish: loading/empty/error states, responsive layout, admin overview stats.

---

## 10. Possible Later Additions

- Email notifications when a PM logs a meeting or moves a card to "Closed Won".
- Export a meeting report or org history to PDF.
- Calendar view for upcoming meetings.
- Activity/audit log (who changed what, when) — useful if you later add more roles.
- File attachments on meeting reports (Supabase Storage bucket).

---

*This plan is Supabase-first and server-light on purpose — it keeps the project buildable end-to-end by one person, which fits a module/project timeline. If you want, I can also generate the actual SQL migration file or scaffold the React project structure next.*
