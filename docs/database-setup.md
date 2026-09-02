# Database setup

This project uses Supabase PostgreSQL through the FastAPI backend. The browser does not connect directly to Supabase.

## Apply the database

In Supabase Dashboard → SQL Editor, run every file in `supabase/migrations/` in filename order. The two changes for the latest features are:

1. `20260901000025_contract_payment_amounts.sql`
   - Adds `university_contracts.amount_paid`.
   - Enforces that paid amount cannot exceed contract value.
   - Enables the API to return the calculated `pending_amount`.
2. `20260901000026_default_placement_industries.sql`
   - Adds starter industry options for existing universities.

New universities receive the same starter industry options automatically from the FastAPI service.

After applying the migrations, restart the backend so its Supabase connection sees the updated schema:

```powershell
cd "C:\Users\ABHINAV TEJA\Downloads\module6-CRM\backend"
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` in the frontend `.env.local` file.
