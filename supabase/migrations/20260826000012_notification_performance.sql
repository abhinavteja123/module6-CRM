-- Support university-scoped notification maintenance and audit queries.
create index if not exists notifications_university_idx
  on public.notifications(university_id, created_at desc);
