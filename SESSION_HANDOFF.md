# Vextra AI Placement CRM — Session Handoff

Date: 2026-08-26  
Workspace: `C:\Users\ABHINAV TEJA\Downloads\module6-CRM`

## Project status

The project is a React/Vite frontend with a FastAPI backend. Supabase is used only as the server-side PostgreSQL database. Supabase Auth has been removed from the application flow.

The local services currently run at:

- Frontend: `http://127.0.0.1:5173`
- FastAPI backend: `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`

The backend health response confirms `application-jwt` authentication and `supabase` database connectivity.

## Architecture

### Frontend

- React 18 with Vite.
- Main application entry: `src/main.jsx`.
- Shared API client and JWT refresh handling: `src/lib/api.js`.
- Global styling: `src/styles.css`.
- The browser communicates with FastAPI only.
- The browser does not contain or use the Supabase service-role key.

### Backend

- FastAPI application: `backend/app/main.py`.
- Custom application JWT access tokens.
- Rotated refresh-token sessions stored in `public.auth_sessions`.
- Passwords stored as bcrypt hashes in `public.profiles`.
- Server-side Supabase client uses the service-role connection.
- Role and university/reporting-line authorization is checked on every protected route.

### Database

Project reference: `yknzygdoghyddudrobjh`

Important migrations:

- `supabase/migrations/20260825000008_application_auth_and_roles.sql`
- `supabase/migrations/20260825000009_remove_legacy_supabase_auth.sql`
- `supabase/migrations/20260825000010_server_only_table_hardening.sql`
- `supabase/migrations/20260826000011_audit_and_notifications.sql`
- `supabase/migrations/20260826000012_notification_performance.sql`

The latest two migrations are applied to the live project. They add `audit_events`, `notifications`, role-scoped RLS policies, and notification indexes. Supabase security advisor currently reports no findings; performance advisor reports only informational unused-index notices.

Main application tables include `profiles`, `universities`, `organizations`, `contacts`, `meeting_reports`, `meeting_action_items`, `kanban_stages`, `kanban_cards`, `auth_sessions`, and `password_reset_requests`.

## Role hierarchy and permissions

| Role | Can manage | Data scope |
| --- | --- | --- |
| `super_admin` | University tenants and university-admin accounts | Control-plane directory; not placement CRM records |
| `university_admin` | Coordinators, regional managers, and placement managers in the same university | University team and permitted university records |
| `coordinator` | Only their own direct-report regional managers and placement managers | Team progress; company/contact identities remain protected |
| `regional_manager` | No account administration | Read-only team progress according to scope |
| `placement_manager` | Their own placement CRM records | Own organizations, contacts, reports, and Kanban work |

The reporting chain is stored in `profiles.reports_to`. The UI displays the manager name in the `Reports to` column.

## Production dashboard upgrade

Implemented across `src/main.jsx`, `src/styles.css`, and `backend/app/main.py`:

- Global search in the top bar with `Ctrl+K`, debounce, grouped permission-aware results, and keyboard navigation.
- Notifications bell, unread state, mark-all-read, and scoped overdue follow-up/Kanban reminders.
- Audit history with role-scoped responses. Permission-denied administrative attempts are recorded without exposing private CRM data.
- Loading, retry/error, success, empty, refresh/last-updated, confirmation, duplicate-submit, responsive table, and accessibility states.
- Accessible modal and drawer behavior with ARIA dialog semantics, Escape-to-close, focus management, and focus trapping.
- Performance improvements: login audit writes and due-notification generation run after the response, placement managers use a direct one-user scope without rebuilding the university tree, university directory lookups use a short TTL cache, and independent super-admin search queries run concurrently.
- Global search avoids empty/one-character backend requests, cancels stale in-flight searches, and only loads notifications when the bell is opened.
- Team monitoring now exposes limited report-tracking metrics for university admins, coordinators, and regional managers: report count, last report date, overdue follow-ups, pending action items, and `On track`/`Needs attention`/`No reports`/`Inactive` status. It does not expose meeting notes, attendees, or contact details.
- University-admin Team now uses expandable reporting hierarchy sections: coordinators are shown as top-level managers, regional/placement managers appear nested under their reporting manager, and direct reports to the university admin are grouped separately. Filters and account actions remain hierarchy-aware.

### Super-admin dashboard

- Separate `Overview`, `Universities`, and `Users` control-plane sections.
- University search, city/status filters, detail drawer, account counts, and activate/deactivate controls.
- Users are grouped by university with the university administrator shown first and other accounts collapsed beneath.
- Account search/filtering, password-state and last-login filters, detail drawer, activity snippets, and CSV export.
- The super-admin's own `super_admin` account is excluded from the Users hierarchy, unassigned accounts, CSV export, search, and role filters. It remains available for authentication and the profile/header menu.
- The Activity navigation item and dashboard audit fetch are removed from every dashboard. The backend audit endpoint remains available for future compliance tooling.

### University-admin dashboard

- Organizations, Contacts, and Meeting Reports are read-only.
- Organization names, owners, statuses, activity, and reports remain visible.
- Personal contact names, email, phone, LinkedIn URL, notes, attendees, and report action details are masked server-side.
- Team hierarchy, account search, metrics, overdue follow-up, and pending-action summaries are available.

### Supervisor and placement-manager dashboards

- Coordinators and regional managers see permitted team progress with protected organization/contact identities and cannot mutate CRM records.
- Coordinators retain direct-report management only; deletion is blocked when team members or CRM history exist, with deactivation guidance.
- Placement managers retain own-record CRM mutation rights for organizations, contacts, reports, action items, stages, and Kanban cards, with filters, confirmations, duplicate checks, overdue highlighting, and activity history.

## Account status behavior

Active and inactive accounts remain visible to the authorized manager so account history and reporting relationships are not lost.

### Deactivate

- Changes `profiles.status` to `inactive`.
- Revokes the account's active sessions.
- Preserves the account, reporting line, and CRM history.
- The inactive user cannot log in until reactivated.

### Reactivate

The shared Team table now shows `Reactivate` for inactive accounts at every applicable level:

- Super admin can reactivate university-admin accounts.
- University admin can reactivate coordinators, regional managers, and placement managers.
- Coordinator can reactivate their own direct-report regional managers and placement managers.

The button uses the same hierarchy-aware PATCH endpoint with `{ "status": "active" }`:

- Super-admin directory: `PATCH /api/admin/users/{user_id}`
- University/team directory: `PATCH /api/team/users/{user_id}`

### Remove

`Remove` is a permanent deletion action for coordinator-managed accounts. The backend refuses deletion with HTTP 409 when the account has child team members or CRM history and instructs the user to deactivate instead.

## Earlier account-status implementation

Updated `src/main.jsx`:

- Added a `reactivate` handler beside the existing `deactivate` handler.
- Added `onReactivate` to the shared `RoleUsers` component.
- Added `Reactivate` rendering for inactive rows.
- Wired the action for the super-admin directory and university/coordinator Team directories.
- Updated the legacy `Managers` component to support the same action if it is used later.

The backend already supported authorized status changes to `active`; no schema migration was required for this UI completion.

## Important backend endpoints

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `POST /api/auth/password-reset-request`
- `GET /api/me`

### Super admin

- `GET /api/admin/universities`
- `POST /api/admin/universities`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/{user_id}` — status management for non-super-admin accounts

### University/team management

- `GET /api/team/summary`
- `GET /api/team/users`
- `POST /api/team/users`
- `PATCH /api/team/users/{user_id}` — edit details or activate/deactivate
- `DELETE /api/team/users/{user_id}` — safe permanent removal for unused accounts

### CRM, search, audit, and notifications

- `GET /api/organizations`, `PATCH /api/organizations/{item_id}`
- `GET /api/contacts`, `PATCH /api/contacts/{contact_id}`
- `GET /api/meeting-reports`
- `GET /api/search?q=&types=&role=&status=&university_id=&limit=&cursor=`
- `GET /api/audit`
- `GET /api/notifications`
- `PATCH /api/notifications/{notification_id}/read`
- `POST /api/notifications/read-all`

## Local startup commands

From the project root:

```powershell
Set-Location "C:\Users\ABHINAV TEJA\Downloads\module6-CRM"
npm install
npm run dev -- --host 127.0.0.1
```

In a second terminal, from the `backend` directory:

```powershell
Set-Location "C:\Users\ABHINAV TEJA\Downloads\module6-CRM\backend"
& ".\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
```

Equivalent backend command from the project root:

```powershell
Set-Location "C:\Users\ABHINAV TEJA\Downloads\module6-CRM"
& ".\backend\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
```

For production, use a process manager/reverse proxy and multiple workers instead of `--reload`:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Required environment configuration

Backend `.env` must contain server-only values for:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BCRYPT_ROUNDS` (currently configured for the practical default of 11)
- `PROFILE_CACHE_TTL_SECONDS`

Frontend `.env` should contain only the API URL, for example:

```text
VITE_API_URL=http://127.0.0.1:8000
```

Never commit `.env`, passwords, JWT secrets, or the Supabase service-role key.

## Validation completed

Completed checks for the latest implementation and audit:

- `npm run build` — passed repeatedly after the final UI changes.
- `python -m compileall -q backend/app` — passed.
- `git diff --check` — passed; only normal line-ending warnings were reported.
- Backend `/health` — healthy with FastAPI JWT and Supabase database.
- Live login/API smoke test — login, `/api/me`, admin users/universities, search, audit, and notifications all returned successfully.
- Live role matrix — verified all five roles:
  - placement manager: own CRM/search/notifications/audit allowed; team/admin routes blocked;
  - regional manager and coordinator: team/search/notifications/audit allowed; CRM mutations blocked;
  - university admin: university records/team/search allowed, CRM mutation blocked, contact identity masking confirmed;
  - super admin: platform users/universities/search allowed, private CRM routes blocked.
- Permission-denied audit test — confirmed blocked requests create `permission_denied` route events.
- Supabase migration list — both audit/notification migrations are applied to project `yknzygdoghyddudrobjh`.
- Supabase security advisor — no lints. Performance advisor — informational unused-index notices only.
- Performance smoke test after optimization — admin search commonly returned in roughly 0.2–0.5s on warm requests; results remain variable because Supabase is remote. Login bcrypt/database latency also varies by cold connection, but synchronous audit work was removed from the response path.
- At the end of the latest session, the local backend is running at `http://127.0.0.1:8000` and the Vite frontend is running at `http://127.0.0.1:5173`.

## User verification checklist

1. Open the app and sign in with an active authorized account.
2. Open `Team`.
3. Deactivate a permitted active account.
4. Confirm the row remains visible with `Inactive` status.
5. Confirm the action changes to `Reactivate`.
6. Click `Reactivate`.
7. Confirm the status changes back to `Active`.
8. Confirm the reactivated account can sign in.
9. Repeat using the appropriate hierarchy level.
10. Use `Ctrl + F5` if an older Vite bundle is still displayed.

## Known behavior and safety notes

- A coordinator only sees and manages direct reports, not another coordinator's team.
- A university admin cannot manage the super-admin account.
- A super admin cannot deactivate or remove the super-admin account through the user directory.
- No dashboard exposes an Activity navigation item or dashboard audit history; the backend audit endpoint remains available for future compliance tooling.
- The super-admin's own account is hidden from the Users directory, unassigned accounts, search, role filters, and CSV export; it remains available for login and profile actions.
- University admins have read-only CRM access and receive server-side masked contact/report personal details.
- Inactive users are intentionally listed so authorized managers can reactivate them.
- Deactivation revokes sessions but does not delete business records.
- Permanent removal is intentionally restricted when child accounts or CRM history exist.
- Browser-level manual verification is still recommended for the exact visual layout in the user's browser; automated build and API checks are passing.

Known follow-ups:

- The planned split of the large `src/main.jsx` file is not yet complete.
- Search accepts `cursor` but currently caps each source query and slices the combined result set; true database cursor pagination should be added before very large-scale deployment.
- Playwright/axe automated browser checks are not configured in this repository; manual browser verification remains recommended.

## Files most relevant to continue

- `src/main.jsx` — application UI, role routing, dashboard navigation, search, notifications, access directories, read-only states, and Team actions.
- `src/lib/api.js` — API requests and token refresh behavior.
- `src/styles.css` — visual styles.
- `backend/app/main.py` — FastAPI routes, JWT auth, authorization, role-scoped search, audit, notifications, read-only masking, team status changes, and safe deletion.
- `backend/.env.example` — backend environment template.
- `supabase/migrations/` — database schema and security migrations.
- `supabase/migrations/20260826000011_audit_and_notifications.sql` — audit and notification tables/policies.
- `supabase/migrations/20260826000012_notification_performance.sql` — notification university-scope index.
- `README.md` and `backend/README.md` — project and startup documentation.
