-- Separate company and university relationship workspaces.
-- Kanban cards intentionally continue to reference both relationship types.
alter table public.organizations
  add column if not exists relationship_type text not null default 'company';

update public.organizations
set relationship_type = 'company'
where relationship_type is null or relationship_type = '';

alter table public.organizations
  drop constraint if exists organizations_relationship_type_check;

alter table public.organizations
  add constraint organizations_relationship_type_check
  check (relationship_type in ('company', 'university'));

create index if not exists organizations_owner_relationship_idx
  on public.organizations(placement_manager_id, relationship_type, created_at desc);
