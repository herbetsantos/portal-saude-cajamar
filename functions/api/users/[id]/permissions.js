import { json, requireAdminPanel, getAdminUnidades } from '../../_utils.js';
import { FEATURES, isFeatureKey, getRoleCeiling } from '../../_permissions.js';

// GET: teto do papel do usuário-alvo + as exceções individuais já salvas.
export async function onRequestGet({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !minhas.includes((target.unidade || '').toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  const ceiling = await getRoleCeiling(env, target.role);
  let results;
  try {
    ({ results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM user_permissions WHERE user_id = ?'
    ).bind(id).all());
  } catch {
    return json({ error: 'A migração migration_permissions.sql ainda não foi executada neste banco.' }, 500);
  }
  const overrides = {};
  results.forEach((r) => { if (isFeatureKey(r.feature_key)) overrides[r.feature_key] = !!r.enabled; });
  // Regulação é individual e, sem configuração explícita, deve aparecer
  // desmarcada (não herda o papel do Portal).
  if (!Object.prototype.hasOwnProperty.call(overrides, 'regulacao_vagas')) overrides.regulacao_vagas = false;

  return json({ role: target.role, features: FEATURES, ceiling, overrides });
}

// PUT: substitui as exceções individuais do usuário.
// body: { permissions: { receituario: true, malotes: false, ... } }
// Qualquer chave fora do teto do papel é ignorada (nunca eleva acima do teto).
export async function onRequestPut({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (target.role === 'super_admin') {
    return json({ error: 'Super Administrador sempre tem acesso completo; não há o que configurar aqui.' }, 400);
  }

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !minhas.includes((target.unidade || '').toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const ceiling = await getRoleCeiling(env, target.role);
  const wanted = body.permissions || {};

  try {
    await env.DB.prepare("DELETE FROM user_permissions WHERE user_id = ? AND feature_key <> 'regulacao_vagas'").bind(id).run();
    for (const f of FEATURES) {
      if (f.key === 'regulacao_vagas') continue; // gerenciado pelo eMulti
      if (!ceiling[f.key]) continue; // nunca grava exceção acima do teto do papel
      const enabled = wanted[f.key] ? 1 : 0;
      await env.DB.prepare(
        'INSERT INTO user_permissions (user_id, feature_key, enabled) VALUES (?, ?, ?)'
      ).bind(id, f.key, enabled).run();
    }
  } catch {
    return json({ error: 'A migração migration_permissions.sql ainda não foi executada neste banco.' }, 500);
  }

  return json({ ok: true });
}
