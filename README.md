# Placement CRM

Private placement relationship management workspace based on `Placement-CRM-Architecture-Plan.md`.

## Run locally

```bash
npm install
npm run dev
```

The UI uses FastAPI for authentication and all application data access. Supabase is used only as the private PostgreSQL database behind FastAPI. There is no Supabase Auth flow or demo-role shortcut in the frontend.

## Supabase database setup

Apply the versioned migrations through `20260825000009_remove_legacy_supabase_auth.sql`. The database is private to the FastAPI service-role connection; the browser does not query Supabase directly.

1. Configure `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
2. Apply all migrations, including `20260825000008_application_auth_and_roles.sql`.
3. Configure `JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`.
4. Start FastAPI, then run `npm run dev` for the frontend.

The browser never receives the service-role key. The backend enforces tenant and reporting-line scope before querying Supabase. Coordinators and regional managers receive masked organization/contact activity; university administrators can view their university's records; placement managers can write only their own records.

## Role-based workspaces

The prior Companies/Universities toggle has been removed. The production workspace is company placement CRM only. Vextra AI super admins manage universities and university administrators. University administrators manage coordinators, regional managers, and placement managers. Coordinators and regional managers track team activity without seeing company or contact identities. Placement managers retain the private Organizations, Contacts, Meeting Reports, and Kanban workflow.

## FastAPI mode

The production architecture uses FastAPI for application JWT authentication and all data APIs while Supabase provides PostgreSQL only. Start the backend from `backend/`, copy `backend/.env.example` to `backend/.env`, and set `VITE_API_URL=http://127.0.0.1:8000` in the frontend `.env`. Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
