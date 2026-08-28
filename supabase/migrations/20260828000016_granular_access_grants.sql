-- Allow a university administrator to grant full or selected CRM areas.
alter table public.placement_access_grants
  drop constraint if exists placement_access_grants_access_level_check;

alter table public.placement_access_grants
  add constraint placement_access_grants_access_level_check
  check (access_level in ('full', 'partial'));

alter table public.placement_access_grants
  add column if not exists permissions jsonb not null default '{"organizations": true, "contacts": true, "meeting_reports": true, "analytics": true}'::jsonb;
