-- Add company-level pipeline tracking fields used by the placement analytics grid.
alter table public.placement_metrics
  add column if not exists pipeline_status text not null default 'prospect',
  add column if not exists outlook text not null default 'neutral',
  add column if not exists expected_date date,
  add column if not exists drive_date date,
  add column if not exists last_contact_date date,
  add column if not exists next_follow_up_date date,
  add column if not exists drive_status text not null default 'not_scheduled',
  add column if not exists company_probability integer not null default 0,
  add column if not exists students_registered integer not null default 0,
  add column if not exists students_selected integer not null default 0,
  add column if not exists students_rejected integer not null default 0,
  add column if not exists next_action text;

alter table public.placement_metrics
  drop constraint if exists placement_metrics_pipeline_status_check,
  drop constraint if exists placement_metrics_outlook_check,
  drop constraint if exists placement_metrics_drive_status_check,
  drop constraint if exists placement_metrics_company_probability_check,
  drop constraint if exists placement_metrics_students_registered_check,
  drop constraint if exists placement_metrics_students_selected_check,
  drop constraint if exists placement_metrics_students_rejected_check;

alter table public.placement_metrics
  add constraint placement_metrics_pipeline_status_check check (pipeline_status in (
    'prospect', 'outreach', 'in_talks', 'discussion', 'proposal_shared',
    'negotiation', 'drive_scheduled', 'drive_completed', 'offer_stage',
    'placed', 'joined', 'on_hold', 'cancelled'
  )),
  add constraint placement_metrics_outlook_check check (outlook in ('positive', 'neutral', 'negative')),
  add constraint placement_metrics_drive_status_check check (drive_status in ('not_scheduled', 'tentative', 'scheduled', 'completed', 'cancelled')),
  add constraint placement_metrics_company_probability_check check (company_probability between 0 and 100),
  add constraint placement_metrics_students_registered_check check (students_registered >= 0),
  add constraint placement_metrics_students_selected_check check (students_selected >= 0),
  add constraint placement_metrics_students_rejected_check check (students_rejected >= 0);

create index if not exists placement_metrics_pipeline_idx
  on public.placement_metrics(university_id, season_id, pipeline_status, expected_date);

create index if not exists placement_metrics_follow_up_idx
  on public.placement_metrics(university_id, next_follow_up_date);
