import { json, requireAuth, requireAdmin, logAudit } from '../_utils.js';
import { isFeatureKey } from '../_permissions.js';
import { normalizeAppKey, getAuthClient } from '../_auth_clients.js';

const CATEGORIES = ['ferramenta', 'documento', 'manual'];

export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  if (category && !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);

  const suffix = category
    ? ' WHERE category = ? ORDER BY sort_order ASC, id ASC'
    : ' ORDER BY category ASC, sort_order ASC, id ASC';

  const queries = [
    'SELECT id,category,title,url,description,sort_order,feature_key,open_mode,auth_client_key FROM links',
    'SELECT id,category,title,url,description,sort_order,feature_key,open_mode FROM links',
    'SELECT id,category,title,url,description,sort_order,open_mode FROM links',
  ];

  let results = null;
  for (const base of queries) {
    try {
      const stmt = category ? env.DB.prepare(base + suffix).bind(category) : env.DB.prepare(base + suffix);
      ({ results } = await stmt.all());
      break;
    } catch {}
  }
  results = (results || []).map((r) => ({ ...r, feature_key: r.feature_key || null, auth_client_key: r.auth_client_key || null }));
  return json({ links: results });
}

async function validateAuthClient(env, rawKey) {
  if (!rawKey) return { key:null };
  const key = normalizeAppKey(rawKey);
  if (!key) return { error:'Aplicação integrada inválida.' };
  const client = await getAuthClient(env,key);
  if (!client) return { error:'Aplicação integrada não encontrada.' };
  return { key };
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const { category, title, url, description, sort_order, feature_key, open_mode } = body;
  if (!category || !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);
  if (!title || !title.trim()) return json({ error: 'Informe um título.' }, 400);
  if (!url || !url.trim()) return json({ error: 'Informe uma URL.' }, 400);
  if (feature_key && !isFeatureKey(feature_key)) return json({ error: 'Funcionalidade inválida.' }, 400);
  if (open_mode && !['_blank', '_self'].includes(open_mode)) return json({ error: 'Modo de abertura inválido.' }, 400);
  const clientCheck = category === 'ferramenta' ? await validateAuthClient(env,body.auth_client_key) : {key:null};
  if (clientCheck.error) return json({ error:clientCheck.error },400);

  const result = await env.DB.prepare(
    'INSERT INTO links (category,title,url,description,sort_order,feature_key,open_mode,auth_client_key) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(category,title.trim(),url.trim(),description ? description.trim() : null,sort_order || 0,feature_key || null,open_mode || '_blank',clientCheck.key).run();

  await logAudit(env,user,'create_link','link',result.meta.last_row_id,{category,title:title.trim(),url:url.trim(),auth_client_key:clientCheck.key});
  return json({ ok:true,id:result.meta.last_row_id },201);
}
