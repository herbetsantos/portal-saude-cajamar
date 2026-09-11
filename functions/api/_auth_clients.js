export function normalizeAppKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{1,63}$/.test(key) ? key : null;
}

export function normalizeOrigin(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (u.protocol !== 'https:') return null;
    if (u.pathname !== '/' || u.search || u.hash || u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function normalizePath(value, fallback = '/') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 1000) return null;
  return raw;
}

export function buildClientRedirect(client, token) {
  const target = new URL(client.callback_path || '/', client.origin);
  target.searchParams.set('handoff', token);
  return target.toString();
}

export async function getAuthClient(env, appKey, { activeOnly = false } = {}) {
  const key = normalizeAppKey(appKey);
  if (!key) return null;
  const sql = `SELECT app_key,name,origin,callback_path,default_destination,active,created_at,updated_at
               FROM auth_clients WHERE app_key=?${activeOnly ? ' AND active=1' : ''}`;
  return await env.DB.prepare(sql).bind(key).first();
}
