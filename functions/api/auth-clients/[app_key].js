import { json, requireSuperAdmin, logAudit } from '../_utils.js';
import { normalizeAppKey, normalizeOrigin, normalizePath } from '../_auth_clients.js';

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;
  const appKey = normalizeAppKey(params.app_key);
  if (!appKey) return json({ error:'Aplicação inválida.' },400);
  let body;
  try { body = await request.json(); } catch { return json({ error:'Requisição inválida.' },400); }
  const name = String(body?.name || '').trim();
  const origin = normalizeOrigin(body?.origin);
  const callbackPath = normalizePath(body?.callback_path, '/');
  const defaultDestination = normalizePath(body?.default_destination, '/');
  if (!name) return json({ error:'Informe o nome da aplicação.' },400);
  if (!origin) return json({ error:'Informe uma origem HTTPS válida, sem caminho.' },400);
  if (!callbackPath || !defaultDestination) return json({ error:'Caminho de retorno ou destino padrão inválido.' },400);

  const result = await env.DB.prepare(`
    UPDATE auth_clients
    SET name=?,origin=?,callback_path=?,default_destination=?,active=?,updated_at=datetime('now')
    WHERE app_key=?
  `).bind(name,origin,callbackPath,defaultDestination,body?.active === false ? 0 : 1,appKey).run();
  if (!result.meta?.changes) return json({ error:'Aplicação não encontrada.' },404);
  await logAudit(env,user,'update_auth_client','auth_client',appKey,{name,origin,callbackPath,defaultDestination,active:body?.active !== false});
  return json({ok:true});
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;
  const appKey = normalizeAppKey(params.app_key);
  if (!appKey) return json({ error:'Aplicação inválida.' },400);
  const linked = await env.DB.prepare('SELECT COUNT(*) AS n FROM links WHERE auth_client_key=?').bind(appKey).first();
  if (Number(linked?.n || 0) > 0) return json({ error:'Esta aplicação está vinculada a uma ferramenta. Remova o vínculo ou apenas inative a aplicação.' },409);
  const result = await env.DB.prepare('DELETE FROM auth_clients WHERE app_key=?').bind(appKey).run();
  if (!result.meta?.changes) return json({ error:'Aplicação não encontrada.' },404);
  await logAudit(env,user,'delete_auth_client','auth_client',appKey,null);
  return json({ok:true});
}
