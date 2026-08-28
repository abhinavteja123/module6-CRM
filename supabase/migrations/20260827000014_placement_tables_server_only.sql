-- Placement configuration and analytics are accessed only through FastAPI.
-- Explicit deny policies keep direct anon/authenticated access closed while
-- allowing the service-role backend to operate.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'placement_seasons',
    'company_categories',
    'university_cities',
    'placement_assignments',
    'placement_targets',
    'placement_metrics',
    'placement_access_grants',
    'duplicate_company_requests'
  ] loop
    execute format(
      'create policy "server_only_%1$s" on public.%1$s for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;
end $$;
