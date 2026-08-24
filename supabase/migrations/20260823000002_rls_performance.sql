-- Evaluate auth.uid() once per statement and keep profiles policies selective.
drop policy if exists "users_read_own_profile" on public.profiles;
drop policy if exists "admins_manage_roster_profiles" on public.profiles;
create policy "users_and_admins_read_profiles"
on public.profiles for select
using (id = (select auth.uid()) or private.is_admin());
create policy "admins_insert_roster_profiles"
on public.profiles for insert
with check (private.is_admin());
create policy "admins_update_roster_profiles"
on public.profiles for update
using (private.is_admin())
with check (private.is_admin());
create policy "admins_delete_roster_profiles"
on public.profiles for delete
using (private.is_admin());
grant execute on function private.is_admin() to anon, authenticated;

drop policy if exists "pm_owns_organizations" on public.organizations;
create policy "pm_owns_organizations" on public.organizations for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));
drop policy if exists "pm_owns_contacts" on public.contacts;
create policy "pm_owns_contacts" on public.contacts for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));
drop policy if exists "pm_owns_meeting_reports" on public.meeting_reports;
create policy "pm_owns_meeting_reports" on public.meeting_reports for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));
drop policy if exists "pm_owns_kanban_stages" on public.kanban_stages;
create policy "pm_owns_kanban_stages" on public.kanban_stages for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));
drop policy if exists "pm_owns_kanban_cards" on public.kanban_cards;
create policy "pm_owns_kanban_cards" on public.kanban_cards for all using (placement_manager_id = (select auth.uid())) with check (placement_manager_id = (select auth.uid()));

create index if not exists kanban_cards_stage_idx on public.kanban_cards(stage_id);
