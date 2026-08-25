-- The application now owns identity and sessions through FastAPI JWTs.
-- Remove the old Supabase Auth profile trigger so new accounts can only be
-- provisioned through the application role-management APIs.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
