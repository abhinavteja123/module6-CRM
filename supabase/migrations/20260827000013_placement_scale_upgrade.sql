-- Placement scale upgrade: unified placement managers, seasons, categories,
-- targets, aggregate placement metrics, city controls, access grants and
-- duplicate-company approval requests.

alter table public.universities
  add column if not exists plan_name text not null default 'Standard',
  add column if not exists plan_price numeric(12,2) not null default 0,
  add column if not exists plan_expires_at date,
  add column if not exists max_accounts integer not null default 100;

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = 'placement_manager'
where role = 'regional_manager';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'university_admin', 'coordinator', 'placement_manager', 'data_analyst'));

create table if not exists public.placement_seasons (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  academic_year text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.company_categories (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  min_ctc_lpa numeric(10,2),
  max_ctc_lpa numeric(10,2),
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(university_id, name),
  check (min_ctc_lpa is null or min_ctc_lpa >= 0),
  check (max_ctc_lpa is null or max_ctc_lpa >= 0),
  check (max_ctc_lpa is null or min_ctc_lpa is null or max_ctc_lpa >= min_ctc_lpa)
);

create table if not exists public.university_cities (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  city text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(university_id, city)
);

create table if not exists public.placement_assignments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  season_id uuid not null references public.placement_seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(season_id, user_id)
);

create table if not exists public.placement_targets (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  season_id uuid not null references public.placement_seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.company_categories(id) on delete set null,
  companies_target integer not null default 0 check (companies_target >= 0),
  drives_target integer not null default 0 check (drives_target >= 0),
  offers_target integer not null default 0 check (offers_target >= 0),
  students_placed_target integer not null default 0 check (students_placed_target >= 0),
  students_joined_target integer not null default 0 check (students_joined_target >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(season_id, user_id, category_id)
);

create table if not exists public.placement_metrics (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  season_id uuid not null references public.placement_seasons(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_manager_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.company_categories(id) on delete set null,
  companies_acquired integer not null default 0 check (companies_acquired >= 0),
  drives_conducted integer not null default 0 check (drives_conducted >= 0),
  offers_received integer not null default 0 check (offers_received >= 0),
  students_placed integer not null default 0 check (students_placed >= 0),
  students_joined integer not null default 0 check (students_joined >= 0),
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, organization_id, placement_manager_id)
);

create table if not exists public.placement_access_grants (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  granted_to uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  access_level text not null default 'full' check (access_level in ('full')),
  scope text not null default 'crm' check (scope in ('crm', 'analytics')),
  created_at timestamptz not null default now(),
  unique(granted_to, scope)
);

create table if not exists public.duplicate_company_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  existing_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_name text not null,
  requested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.organizations
  add column if not exists duplicate_approved boolean not null default false;

create index if not exists placement_seasons_university_idx on public.placement_seasons(university_id, status, start_date desc);
create index if not exists categories_university_idx on public.company_categories(university_id, name);
create index if not exists university_cities_scope_idx on public.university_cities(university_id, is_active, city);
create index if not exists placement_assignments_scope_idx on public.placement_assignments(university_id, season_id, user_id);
create index if not exists placement_targets_scope_idx on public.placement_targets(university_id, season_id, user_id);
create index if not exists placement_metrics_scope_idx on public.placement_metrics(university_id, season_id, placement_manager_id);
create index if not exists duplicate_requests_scope_idx on public.duplicate_company_requests(university_id, status, created_at desc);

alter table public.placement_seasons enable row level security;
alter table public.company_categories enable row level security;
alter table public.university_cities enable row level security;
alter table public.placement_assignments enable row level security;
alter table public.placement_targets enable row level security;
alter table public.placement_metrics enable row level security;
alter table public.placement_access_grants enable row level security;
alter table public.duplicate_company_requests enable row level security;

-- FastAPI service-role access is the only data path.
