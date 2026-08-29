-- University-admin-managed industry catalog for organization classification.
-- Placement managers can only select from this catalog when creating or editing
-- an organization. The legacy text column remains for backwards compatibility.

create table if not exists public.placement_industries (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists placement_industries_university_name_idx
  on public.placement_industries(university_id, lower(trim(name)));

alter table public.organizations
  add column if not exists industry_id uuid references public.placement_industries(id) on delete set null;

create index if not exists organizations_industry_idx
  on public.organizations(university_id, industry_id);

alter table public.placement_industries enable row level security;
