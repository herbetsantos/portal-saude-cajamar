import { json, requireAdmin } from '../_utils.js';

const CATEGORIES = ['ferramenta', 'documento', 'manual'];

export async function onRequestPut({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { category, title, url, description, sort_order } = body;
  if (category && !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);
  if (!title || !title.trim()) return json({ error: 'Informe um título.' }, 400);
  if (!url || !url.trim()) return json({ error: 'Informe uma URL.' }, 400);

  await env.DB.prepare(
    `UPDATE links SET category = COALESCE(?, category), title = ?, url = ?, description = ?, sort_order = ?
     WHERE id = ?`
  )
    .bind(category || null, title.trim(), url.trim(), description ? description.trim() : null, sort_order || 0, id)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
