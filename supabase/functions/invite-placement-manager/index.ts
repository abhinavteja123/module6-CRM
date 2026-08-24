import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  const { data: caller } = await auth.from('profiles').select('role').eq('id', user.id).single();
  if (caller?.role !== 'admin') return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
  const { email, full_name, password } = await req.json(); const admin = createClient(url, service);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, email, full_name, role: 'placement_manager', status: 'active' });
  if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ user: data.user }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
