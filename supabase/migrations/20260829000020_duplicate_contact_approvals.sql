-- Contact-level duplicate approvals. Duplicate organizations remain allowed;
-- only a contact already present for the same company needs review.

create table if not exists public.duplicate_contact_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  existing_contact_id uuid not null references public.contacts(id) on delete cascade,
  existing_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_name text not null,
  requested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists duplicate_contact_requests_scope_idx
  on public.duplicate_contact_requests(university_id, status, created_at desc);

create unique index if not exists duplicate_contact_requests_one_pending_idx
  on public.duplicate_contact_requests(university_id, existing_contact_id, requested_organization_id)
  where status = 'pending';

alter table public.duplicate_contact_requests enable row level security;

create policy "server_only_duplicate_contact_requests"
  on public.duplicate_contact_requests
  for all to anon, authenticated
  using (false) with check (false);
