import { json, requireAdmin, hashPassword, randomHex } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user: requester, error } = await requireAdmin(request, env);
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

  const { name, role, active, newPassword, unidade } = body;

  const targetIsAdminLevel = target.role === 'admin' || target.role === 'super_admin';
  const newRoleIsAdminLevel = role === 'admin' || role === 'super_admin';

  if ((targetIsAdminLevel || newRoleIsAdminLevel) && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode gerenciar contas de administrador.' }, 403);
  }
  if (id === requester.id && role === 'user') {
    return json({ error: 'Você não pode remover seu próprio acesso de administrador.' }, 400);
  }
  if (id === requester.id && active === false) {
    return json({ error: 'Você não pode desativar seu próprio usuário.' }, 400);
  }

  const updates = [];
  const values = [];

  if (name && name.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (role === 'admin' || role === 'user' || role === 'super_admin') {
    updates.push('role = ?');
    values.push(role);
  }
  if (typeof active === 'boolean') {
    updates.push('active = ?');
    values.push(active ? 1 : 0);
  }
  if (typeof unidade === 'string') {
    updates.push('unidade = ?');
    values.push(unidade.trim() || null);
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
  const { user: requester, error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);
  if (id === requester.id) return json({ error: 'Você não pode excluir o seu próprio usuário.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if ((target.role === 'admin' || target.role === 'super_admin') && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode excluir contas de administrador.' }, 403);
  }

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

  return json({ ok: true });
}
