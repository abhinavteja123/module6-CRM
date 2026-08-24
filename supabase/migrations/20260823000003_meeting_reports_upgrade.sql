alter table public.meeting_reports
  add column if not exists outcome text not null default 'neutral' check (outcome in ('positive','neutral','negative','follow_up_required')),
  add column if not exists follow_up_date date not null default current_date,
  add column if not exists meeting_type text not null default 'video_call' check (meeting_type in ('in_person','video_call','phone_call'));

create table if not exists public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_report_id uuid not null references public.meeting_reports(id) on delete cascade,
  placement_manager_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  is_completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.meeting_action_items enable row level security;
create policy "pm_owns_meeting_action_items" on public.meeting_action_items for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));
create index if not exists meeting_action_items_report_idx on public.meeting_action_items(meeting_report_id, position);
create index if not exists meeting_action_items_owner_idx on public.meeting_action_items(placement_manager_id);
