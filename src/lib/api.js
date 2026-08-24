import { supabase } from './supabaseClient';

export const apiBase = import.meta.env.VITE_API_URL || '';
export const isApiConfigured = Boolean(import.meta.env.VITE_API_URL);

export async function apiFetch(path, options = {}) {
  if (!supabase) throw new Error('Supabase Auth is not configured');
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}), Authorization: `Bearer ${session?.access_token || ''}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || 'API request failed');
  return body;
}
