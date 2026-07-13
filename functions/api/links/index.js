import { json, requireAuth, requireAdmin } from '../_utils.js';

const CATEGORIES = ['ferramenta', 'documento', 'manual'];

export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const category = url.searchParams.get('category');

  let query = 'SELECT id, category, title, url, description, sort_order FROM links';
  let stmt;
  if (category) {
    if (!CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);
    stmt = env.DB.prepare(query + ' WHERE category = ? ORDER BY sort_order ASC, id ASC').bind(category);
  } else {
    stmt = env.DB.prepare(query + ' ORDER BY category ASC, sort_order ASC, id ASC');
  }

  const { results } = await stmt.all();
  return json({ links: results });
}

export async function onRequestPost({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { category, title, url, description, sort_order } = body;
  if (!category || !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);
  if (!title || !title.trim()) return json({ error: 'Informe um título.' }, 400);
  if (!url || !url.trim()) return json({ error: 'Informe uma URL.' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO links (category, title, url, description, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(category, title.trim(), url.trim(), description ? description.trim() : null, sort_order || 0)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
