import { json, verifyPassword, createSession, sessionCookieHeader } from './_utils.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!username || !password) {
    return json({ error: 'Informe usuário e senha.' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, username, name, password_hash, salt, role, active FROM users WHERE lower(username) = ?'
  )
    .bind(username)
    .first();

  // Mensagem genérica em caso de erro, para não revelar se o usuário existe.
  const invalidMsg = { error: 'Usuário ou senha inválidos.' };

  if (!user || !user.active) {
    return json(invalidMsg, 401);
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) {
    return json(invalidMsg, 401);
  }

  const token = await createSession(env, user.id);

  return json(
    { ok: true, user: { username: user.username, name: user.name, role: user.role } },
    200,
    { 'Set-Cookie': sessionCookieHeader(token) }
  );
}
