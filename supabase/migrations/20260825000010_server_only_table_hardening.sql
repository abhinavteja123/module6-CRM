-- These tables are intentionally server-only. Explicit deny policies make
-- that contract visible to auditors while service_role remains unrestricted.
create policy "server_only_universities"
on public.universities for all to anon, authenticated
using (false) with check (false);

create policy "server_only_auth_sessions"
on public.auth_sessions for all to anon, authenticated
using (false) with check (false);

create policy "server_only_password_reset_requests"
on public.password_reset_requests for all to anon, authenticated
using (false) with check (false);

create index if not exists password_reset_requests_user_idx
  on public.password_reset_requests(user_id, expires_at)
  where used_at is null;
