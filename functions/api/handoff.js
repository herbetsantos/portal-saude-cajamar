import { json, getAuthUser } from './_utils.js';
import { normalizeAppKey, normalizePath, getAuthClient, buildClientRedirect } from './_auth_clients.js';

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401, { 'Cache-Control': 'no-store' });

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const appKey = normalizeAppKey(body?.app_key);
  if (!appKey) return json({ error: 'Aplicação inválida.' }, 400);

  const client = await getAuthClient(env, appKey, { activeOnly: true });
  if (!client) return json({ error: 'Aplicação não cadastrada ou inativa.' }, 404);

  const destination = normalizePath(body?.destination, client.default_destination || '/');
  if (!destination) return json({ error: 'Destino inválido.' }, 400);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO handoff_tokens (token,user_id,expires_at,app_key,destination) VALUES (?,?,?,?,?)'
  ).bind(token, user.id, expiresAt, appKey, destination).run();

  try {
    await env.DB.prepare("DELETE FROM handoff_tokens WHERE expires_at < datetime('now', '-1 hour') OR (used=1 AND created_at < datetime('now', '-1 hour'))").run();
  } catch {}

  return json({
    ok: true,
    app_key: appKey,
    expires_at: expiresAt,
    redirect_url: buildClientRedirect(client, token),
  }, 200, { 'Cache-Control': 'no-store' });
}
