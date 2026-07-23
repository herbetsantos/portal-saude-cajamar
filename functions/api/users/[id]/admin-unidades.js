import { json, requireSuperAdmin } from '../../_utils.js';

// GET: lista as unidades já usadas por algum usuário no sistema + quais
// estão atribuídas a este admin_unidade.
export async function onRequestGet({ request, env, params }) {
  const { error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  const { results: todas } = await env.DB.prepare(
    `SELECT DISTINCT unidade FROM users WHERE unidade IS NOT NULL AND trim(unidade) <> '' ORDER BY unidade ASC`
  ).all();

  const { results: atribuidas } = await env.DB.prepare(
    'SELECT unidade FROM admin_unidades WHERE admin_user_id = ?'
  ).bind(id).all();

  return json({
    unidades: todas.map((r) => r.unidade),
    atribuidas: atribuidas.map((r) => r.unidade),
  });
}

// PUT: substitui a lista de unidades que este admin_unidade gerencia
// body: { unidades: ['UBS Jardim...', 'Secretaria', ...] }
export async function onRequestPut({ request, env, params }) {
  const { error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const unidades = Array.isArray(body.unidades)
    ? [...new Set(body.unidades.map((u) => String(u || '').trim()).filter(Boolean))]
    : [];

  await env.DB.prepare('DELETE FROM admin_unidades WHERE admin_user_id = ?').bind(id).run();
  for (const u of unidades) {
    await env.DB.prepare('INSERT INTO admin_unidades (admin_user_id, unidade) VALUES (?, ?)').bind(id, u).run();
  }

  return json({ ok: true, unidades });
}
