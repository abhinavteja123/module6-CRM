-- Allow each university administrator to decide whether coordinators may enter targets.
alter table public.universities
  add column if not exists coordinator_target_entry_enabled boolean not null default false;
