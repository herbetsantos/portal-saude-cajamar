import { json, requireAdminPanel, getAdminUnidades, hashPassword, randomHex } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (minhas.length === 0) return json({ users: [] });
    const placeholders = minhas.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, username, name, role, active, unidade, created_at FROM users
       WHERE role = 'user' AND lower(unidade) IN (${placeholders})
       ORDER BY name ASC`
    ).bind(...minhas).all();
    return json({ users: results });
  }

  const { results } = await env.DB.prepare(
    'SELECT id, username, name, role, active, unidade, created_at FROM users ORDER BY name ASC'
  ).all();

  return json({ users: results });
}

export async function onRequestPost({ request, env }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
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
  const unidade = (body.unidade || '').trim();
  const allowedRoles = ['admin', 'super_admin', 'admin_unidade'];
  const requestedRole = allowedRoles.includes(body.role) ? body.role : 'user';

  if (requestedRole !== 'user' && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode criar contas de administrador.' }, 403);
  }

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (!unidade || !minhas.includes(unidade.toLowerCase())) {
      return json({ error: 'Você só pode cadastrar usuários das unidades sob sua gestão.' }, 403);
    }
  }

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
    'INSERT INTO users (username, name, password_hash, salt, role, unidade) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(username, name, hash, salt, requestedRole, unidade || null)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
