import { json, requireAdmin, requireSuperAdmin, logAudit } from '../_utils.js';
import { normalizeAppKey, normalizeOrigin, normalizePath } from '../_auth_clients.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  const { results } = await env.DB.prepare(
    'SELECT app_key,name,origin,callback_path,default_destination,active,created_at,updated_at FROM auth_clients ORDER BY name COLLATE NOCASE,app_key'
  ).all();
  return json({ clients: results || [] }, 200, { 'Cache-Control': 'no-store' });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const appKey = normalizeAppKey(body?.app_key);
  const name = String(body?.name || '').trim();
  const origin = normalizeOrigin(body?.origin);
  const callbackPath = normalizePath(body?.callback_path, '/');
  const defaultDestination = normalizePath(body?.default_destination, '/');
  if (!appKey) return json({ error: 'Chave da aplicação inválida.' }, 400);
  if (!name) return json({ error: 'Informe o nome da aplicação.' }, 400);
  if (!origin) return json({ error: 'Informe uma origem HTTPS válida, sem caminho.' }, 400);
  if (!callbackPath || !defaultDestination) return json({ error: 'Caminho de retorno ou destino padrão inválido.' }, 400);

  try {
    await env.DB.prepare(`
      INSERT INTO auth_clients(app_key,name,origin,callback_path,default_destination,active,updated_at)
      VALUES(?,?,?,?,?,?,datetime('now'))
    `).bind(appKey,name,origin,callbackPath,defaultDestination,body?.active === false ? 0 : 1).run();
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('unique')) return json({ error: 'Já existe uma aplicação com essa chave.' }, 409);
    throw err;
  }

  await logAudit(env,user,'create_auth_client','auth_client',appKey,{name,origin,callbackPath,defaultDestination});
  return json({ ok:true, app_key:appKey },201);
}
