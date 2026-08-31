-- Add the active drive stage without invalidating existing legacy pipeline rows.
alter table public.placement_metrics
  drop constraint if exists placement_metrics_pipeline_status_check;

alter table public.placement_metrics
  add constraint placement_metrics_pipeline_status_check
  check (pipeline_status in (
    'prospect', 'outreach', 'in_talks', 'discussion', 'proposal_shared',
    'negotiation', 'drive_scheduled', 'drive_ongoing', 'drive_completed',
    'offer_stage', 'placed', 'joined', 'on_hold', 'cancelled'
  ));
