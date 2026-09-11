import { json } from '../_utils.js';
import { normalizeAppKey } from '../_auth_clients.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400, { 'Cache-Control': 'no-store' }); }

  const token = String(body?.token || '').trim();
  const appKey = normalizeAppKey(body?.app_key);
  if (!token || token.length < 32 || !appKey) return json({ error: 'Código de acesso inválido.' }, 400, { 'Cache-Control': 'no-store' });

  const row = await env.DB.prepare(`
    SELECT h.user_id,h.expires_at,h.used,h.app_key,h.destination,
           u.username,u.name,u.role,u.active,
           c.active AS client_active
    FROM handoff_tokens h
    JOIN users u ON u.id=h.user_id
    JOIN auth_clients c ON c.app_key=h.app_key
    WHERE h.token=? AND h.app_key=?
  `).bind(token, appKey).first();

  if (!row || row.used || !row.active || !row.client_active) {
    return json({ error: 'Código de acesso inválido ou já utilizado.' }, 401, { 'Cache-Control': 'no-store' });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ error: 'Código de acesso expirado.' }, 401, { 'Cache-Control': 'no-store' });
  }

  const updated = await env.DB.prepare(
    'UPDATE handoff_tokens SET used=1 WHERE token=? AND app_key=? AND used=0'
  ).bind(token, appKey).run();
  if (!updated.meta?.changes) return json({ error: 'Código de acesso já utilizado.' }, 401, { 'Cache-Control': 'no-store' });

  return json({
    ok: true,
    app_key: appKey,
    destination: row.destination || '/',
    user: {
      id: Number(row.user_id),
      username: row.username,
      name: row.name,
      role: row.role,
    },
  }, 200, { 'Cache-Control': 'no-store' });
}
