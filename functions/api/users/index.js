import { json, requireAdmin, hashPassword, randomHex } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    'SELECT id, username, name, role, active, created_at FROM users ORDER BY name ASC'
  ).all();

  return json({ users: results });
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

  const username = (body.username || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const password = body.password || '';
  const role = body.role === 'admin' ? 'admin' : 'user';

  if (!username || !name) return json({ error: 'Informe usuário e nome.' }, 400);
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json({ error: 'Usuário deve ter 3-32 caracteres (letras, números, ponto, hífen, underline).' }, 400);
  }
  if (!password || password.length < 8) {
    return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = ?').bind(username).first();
  if (existing) return json({ error: 'Já existe um usuário com esse login.' }, 409);

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  const result = await env.DB.prepare(
    'INSERT INTO users (username, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(username, name, hash, salt, role)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
