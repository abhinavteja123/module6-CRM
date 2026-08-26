-- Production observability and in-app notification records.
-- These tables are server-only; the FastAPI service role is the sole data path.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  university_id uuid references public.universities(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_scope_created_idx
  on public.audit_events(university_id, created_at desc);
create index if not exists audit_events_actor_created_idx
  on public.audit_events(actor_id, created_at desc);
create index if not exists audit_events_entity_idx
  on public.audit_events(entity_type, entity_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

alter table public.audit_events enable row level security;
alter table public.notifications enable row level security;

create policy "server_only_audit_events"
on public.audit_events for all to anon, authenticated
using (false) with check (false);

create policy "server_only_notifications"
on public.notifications for all to anon, authenticated
using (false) with check (false);
