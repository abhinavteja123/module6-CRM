-- Application-owned identity and multi-tenant role hierarchy.
-- Supabase Auth is intentionally not used by the FastAPI application.

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  city text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column role drop default,
  alter column role type text using role::text,
  alter column role set default 'placement_manager';

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles set role = 'super_admin' where role = 'admin';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'university_admin', 'coordinator', 'regional_manager', 'placement_manager'));

alter table public.profiles
  add column if not exists password_hash text,
  add column if not exists university_id uuid references public.universities(id) on delete set null,
  add column if not exists reports_to uuid references public.profiles(id) on delete set null,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists last_login_at timestamptz;

alter table public.organizations
  add column if not exists university_id uuid references public.universities(id) on delete set null;

create index if not exists profiles_university_role_idx
  on public.profiles(university_id, role, status);
create index if not exists profiles_reports_to_idx
  on public.profiles(reports_to, status);
create index if not exists organizations_university_idx
  on public.organizations(university_id, created_at desc);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  refresh_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_idx
  on public.auth_sessions(user_id, expires_at)
  where revoked_at is null;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.universities enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.password_reset_requests enable row level security;

-- No browser policy is added. The FastAPI service role is the only data path.
