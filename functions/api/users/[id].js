import { json, requireAdmin, hashPassword, randomHex } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user: admin, error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { name, role, active, newPassword } = body;

  if (id === admin.id && role && role !== 'admin') {
    return json({ error: 'Você não pode remover seu próprio acesso de administrador.' }, 400);
  }
  if (id === admin.id && active === false) {
    return json({ error: 'Você não pode desativar seu próprio usuário.' }, 400);
  }

  const updates = [];
  const values = [];

  if (name && name.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (role === 'admin' || role === 'user') {
    updates.push('role = ?');
    values.push(role);
  }
  if (typeof active === 'boolean') {
    updates.push('active = ?');
    values.push(active ? 1 : 0);
  }
  if (newPassword) {
    if (newPassword.length < 8) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
    const salt = randomHex(16);
    const hash = await hashPassword(newPassword, salt);
    updates.push('password_hash = ?', 'salt = ?');
    values.push(hash, salt);
  }

  if (updates.length === 0) return json({ error: 'Nada para atualizar.' }, 400);

  values.push(id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user: admin, error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);
  if (id === admin.id) return json({ error: 'Você não pode excluir o seu próprio usuário.' }, 400);

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

  return json({ ok: true });
}
