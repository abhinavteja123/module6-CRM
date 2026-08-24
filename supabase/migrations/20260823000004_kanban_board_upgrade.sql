alter table public.kanban_stages
  add column if not exists wip_limit integer;

alter table public.kanban_stages
  drop constraint if exists kanban_stages_wip_limit_check;

alter table public.kanban_stages
  add constraint kanban_stages_wip_limit_check
  check (wip_limit is null or wip_limit > 0);

alter table public.kanban_cards
  add column if not exists completed_at timestamptz;

create index if not exists kanban_cards_due_date_idx
  on public.kanban_cards(placement_manager_id, due_date);

create index if not exists kanban_cards_priority_idx
  on public.kanban_cards(placement_manager_id, priority);
