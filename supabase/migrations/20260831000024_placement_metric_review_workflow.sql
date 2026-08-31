-- Coordinator placement updates can be reviewed by the owning placement manager.
alter table public.placement_metrics
  add column if not exists review_status text not null default 'approved',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.placement_metrics
  drop constraint if exists placement_metrics_review_status_check;

alter table public.placement_metrics
  add constraint placement_metrics_review_status_check
  check (review_status in ('approved', 'pending', 'changes_requested'));

create index if not exists placement_metrics_review_idx
  on public.placement_metrics(university_id, placement_manager_id, review_status, updated_at desc);
