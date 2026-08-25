# Placement CRM FastAPI backend

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

Set-Location "C:\Users\ABHINAV TEJA\Downloads\module6-CRM\backend"

& ".\backend\.venv\Scripts\python.exe" -m pip install -r ".\requirements.txt"
& ".\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000

From the project root, use the equivalent path:

```powershell
Set-Location "C:\Users\ABHINAV TEJA\Downloads\module6-CRM"
& ".\backend\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
```

The backend owns authentication. It hashes passwords with bcrypt, issues short-lived access JWTs and rotated refresh tokens, and enforces the role hierarchy on every route. Supabase is used only as the server-side PostgreSQL database through the service-role connection; no Supabase Auth calls are made.

Authentication uses bcrypt cost 11 by default for a practical latency/security balance, a short-lived in-process profile cache for repeated authorized requests, and a background update for non-critical last-login bookkeeping. For production, run multiple worker processes behind a reverse proxy instead of using `--reload`:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Roles are `super_admin`, `university_admin`, `coordinator`, `regional_manager`, and `placement_manager`. Set `JWT_SECRET` and the bootstrap admin variables in `backend/.env` before starting. The bootstrap admin is created once if no super admin exists; change that password after first login.
