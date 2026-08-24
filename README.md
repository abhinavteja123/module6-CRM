# Placement CRM

Private placement relationship management workspace based on `Placement-CRM-Architecture-Plan.md`.

## Run locally

```bash
npm install
npm run dev
```

The UI runs in demo mode without environment variables. Use the role buttons on the login screen to preview the Placement Manager and Admin experiences. For production, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example`, apply the migration, and deploy the Edge Function. When the variables are present, the frontend uses Supabase Auth, Postgres CRUD, RLS, and Realtime automatically.

## Supabase setup

Apply `supabase/migrations/20260823000000_initial_schema.sql`, then deploy `supabase/functions/invite-placement-manager`. The five PM-owned tables have owner-only policies; admins intentionally have no read policies for PM data.

1. Create a Supabase project and copy its URL and anon key into a local `.env` file using `.env.example`.
2. Apply the migration with Supabase Studio SQL editor or `supabase db push`.
3. Create the first user in Supabase Authentication, then promote that user once in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'your-admin@example.com';
   ```

4. Deploy the function with `supabase functions deploy invite-placement-manager`. The function uses the project service-role secret only on the server.
5. In Supabase Database → Replication, enable `kanban_cards` so Realtime moves are delivered to open workspaces.
6. Run `npm run dev` for local development or `npm run build && npm run preview` to inspect the production bundle.

The browser never receives a service-role key. Admin roster access is limited to `profiles`; the five PM-owned tables have no admin policy and remain database-isolated.

## FastAPI mode

The production architecture uses FastAPI for all application data APIs while Supabase provides Auth and PostgreSQL. Start the backend from `backend/`, copy `backend/.env.example` to `backend/.env`, and set `VITE_API_URL=http://localhost:8000` in the frontend `.env`. The frontend continues to use Supabase Auth to obtain the JWT, then sends that JWT to FastAPI. Do not put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
