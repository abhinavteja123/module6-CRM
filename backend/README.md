# Placement CRM FastAPI backend

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend uses Supabase Auth to validate bearer tokens and Supabase PostgreSQL for persistence. The service-role key is server-only. Every PM query includes an explicit `placement_manager_id` owner filter; admin endpoints are isolated to the profiles roster.
