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

Main application tables include `profiles`, `universities`, `organizations`, `contacts`, `meeting_reports`, `meeting_action_items`, `kanban_stages`, `kanban_cards`, `auth_sessions`, and `password_reset_requests`.

## Role hierarchy and permissions

| Role | Can manage | Data scope |
| --- | --- | --- |
| `super_admin` | University tenants and university-admin accounts | Entire platform directory; not placement CRM records |
| `university_admin` | Coordinators, regional managers, and placement managers in the same university | University team and permitted university records |
| `coordinator` | Only their own direct-report regional managers and placement managers | Team progress; company/contact identities remain protected |
| `regional_manager` | No account administration | Read-only team progress according to scope |
| `placement_manager` | Their own placement CRM records | Own organizations, contacts, reports, and Kanban work |

The reporting chain is stored in `profiles.reports_to`. The UI displays the manager name in the `Reports to` column.

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

## Current implementation change in this session

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

Completed checks for this session and the immediately preceding implementation:

- `npm run build` — passed.
- `python -m compileall -q app` — passed.
- `git diff --check` — passed; only normal line-ending warnings were reported.
- `npm audit --omit=dev` — 0 vulnerabilities.
- Frontend HTTP check — 200.
- Backend `/health` — healthy with FastAPI JWT and Supabase database.
- API status-flow test — passed at all hierarchy levels:
  - super admin deactivated and reactivated a university admin;
  - university admin deactivated and reactivated a coordinator;
  - coordinator deactivated and reactivated a placement manager.
- Temporary verification university and accounts were removed after testing.

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
- Inactive users are intentionally listed so authorized managers can reactivate them.
- Deactivation revokes sessions but does not delete business records.
- Permanent removal is intentionally restricted when child accounts or CRM history exist.
- Browser-level manual verification is still recommended for the exact visual layout in the user's browser; automated build and API checks are passing.

## Files most relevant to continue

- `src/main.jsx` — application UI, role routing, Team actions, Reactivate button.
- `src/lib/api.js` — API requests and token refresh behavior.
- `src/styles.css` — visual styles.
- `backend/app/main.py` — FastAPI routes, JWT auth, authorization, team status changes, safe deletion.
- `backend/.env.example` — backend environment template.
- `supabase/migrations/` — database schema and security migrations.
- `README.md` and `backend/README.md` — project and startup documentation.

