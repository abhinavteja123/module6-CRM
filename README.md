# Placement CRM

Private placement relationship management workspace based on `Placement-CRM-Architecture-Plan.md`.

## Run locally

```bash
npm install
npm run dev
```

The UI uses FastAPI for authentication and all application data access. Supabase is used only as the private PostgreSQL database behind FastAPI. There is no Supabase Auth flow or demo-role shortcut in the frontend.

## Supabase database setup

Apply every versioned migration in `supabase/migrations/`, through the latest `20260829000021_admin_managed_industries.sql`. The database is private to the FastAPI service-role connection; the browser does not query Supabase directly.

1. Configure `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
2. Apply all migrations, including `20260825000008_application_auth_and_roles.sql`.
3. Apply `20260826000011_audit_and_notifications.sql` for audit history and in-app notifications.
4. Apply `20260828000018_organization_categories.sql` before using the company-category field when creating organizations.
5. Apply `20260829000021_admin_managed_industries.sql` before using the admin-managed industry selector when creating organizations.
6. Configure `JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`.
7. Start FastAPI, then run `npm run dev` for the frontend.

For optional dashboard NLP summaries, add the server-only `GROQ_API_KEY` to
`backend/.env`. The backend uses Groq's OpenAI-compatible chat completions
endpoint and defaults to `openai/gpt-oss-20b`. If the key is missing or the
provider is unavailable, the dashboard falls back to deterministic placement
insights. Never put the Groq key in frontend environment files.

The browser never receives the service-role key. The backend enforces tenant and reporting-line scope before querying Supabase. Coordinators and regional managers receive masked organization/contact activity; university administrators can view their university's records; placement managers can write only their own records.

Placement roles are intentionally separated: University Admins and Data Analysts use the read-only Placement Analytics dashboard; coordinators use Placement Tracker to maintain placement status and outcomes; Placement Managers use Placement Updates for the company-side placement records.

The application also provides a permission-scoped global search at `/api/search`, audit history at `/api/audit`, and in-app notifications at `/api/notifications`. University administrators can read organization activity while personal contact identity fields remain masked.

## Role-based workspaces

The prior Companies/Universities toggle has been removed. The production workspace is company placement CRM only. Vextra AI super admins manage universities and university administrators. University administrators manage coordinators, regional managers, and placement managers. Coordinators and regional managers track team activity without seeing company or contact identities. Placement managers retain the private Organizations, Contacts, Meeting Reports, and Kanban workflow.

## FastAPI mode

The production architecture uses FastAPI for application JWT authentication and all data APIs while Supabase provides PostgreSQL only. Start the backend from `backend/`, copy `backend/.env.example` to `backend/.env`, and set `VITE_API_URL=http://127.0.0.1:8000` in the frontend `.env`. Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
