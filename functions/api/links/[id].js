import { json, requireAdmin, logAudit } from '../_utils.js';
import { isFeatureKey } from '../_permissions.js';
import { normalizeAppKey, getAuthClient } from '../_auth_clients.js';

const CATEGORIES = ['ferramenta', 'documento', 'manual'];

async function validateAuthClient(env, rawKey) {
  if (!rawKey) return { key:null };
  const key = normalizeAppKey(rawKey);
  if (!key) return { error:'Aplicação integrada inválida.' };
  const client = await getAuthClient(env,key);
  if (!client) return { error:'Aplicação integrada não encontrada.' };
  return { key };
}

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const id = Number(params.id);
  if (!id) return json({ error:'ID inválido.' },400);
  let body;
  try { body = await request.json(); } catch { return json({ error:'Requisição inválida.' },400); }

  const { category,title,url,description,sort_order,feature_key,open_mode } = body;
  if (category && !CATEGORIES.includes(category)) return json({ error:'Categoria inválida.' },400);
  if (!title || !title.trim()) return json({ error:'Informe um título.' },400);
  if (!url || !url.trim()) return json({ error:'Informe uma URL.' },400);
  if (feature_key && !isFeatureKey(feature_key)) return json({ error:'Funcionalidade inválida.' },400);
  if (open_mode && !['_blank','_self'].includes(open_mode)) return json({ error:'Modo de abertura inválido.' },400);
  const clientCheck = category === 'ferramenta' ? await validateAuthClient(env,body.auth_client_key) : {key:null};
  if (clientCheck.error) return json({ error:clientCheck.error },400);

  await env.DB.prepare(`
    UPDATE links SET category=COALESCE(?,category),title=?,url=?,description=?,sort_order=?,feature_key=?,open_mode=?,auth_client_key=?
    WHERE id=?
  `).bind(category || null,title.trim(),url.trim(),description ? description.trim() : null,sort_order || 0,feature_key || null,open_mode || '_blank',clientCheck.key,id).run();

  await logAudit(env,user,'update_link','link',id,{category,title:title.trim(),url:url.trim(),auth_client_key:clientCheck.key});
  return json({ok:true});
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const id = Number(params.id);
  if (!id) return json({ error:'ID inválido.' },400);
  await env.DB.prepare('DELETE FROM links WHERE id=?').bind(id).run();
  await logAudit(env,user,'delete_link','link',id,null);
  return json({ok:true});
}
