-- Keep the auth trigger function server-only.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Keep the admin helper out of the exposed public API schema while allowing RLS
-- to call it for signed-in users.
create schema if not exists private;
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
drop policy if exists "admins_manage_roster_profiles" on public.profiles;
create policy "admins_manage_roster_profiles"
on public.profiles for all
using (private.is_admin())
with check (private.is_admin());
revoke all on function public.is_admin() from public, anon, authenticated;

-- Cover owner and relationship foreign keys used by the API and RLS checks.
create index if not exists organizations_owner_idx on public.organizations(placement_manager_id);
create index if not exists contacts_owner_idx on public.contacts(placement_manager_id);
create index if not exists contacts_organization_idx on public.contacts(organization_id);
create index if not exists meeting_reports_owner_idx on public.meeting_reports(placement_manager_id);
create index if not exists meeting_reports_organization_idx on public.meeting_reports(organization_id);
create index if not exists meeting_reports_contact_idx on public.meeting_reports(contact_id);
create index if not exists kanban_stages_owner_position_idx on public.kanban_stages(placement_manager_id, position);
create index if not exists kanban_cards_owner_stage_position_idx on public.kanban_cards(placement_manager_id, stage_id, position);
create index if not exists kanban_cards_organization_idx on public.kanban_cards(organization_id);
