// Lógica da página admin.html

const CATEGORY_LABEL = { ferramenta: 'ferramenta', documento: 'documento', manual: 'manual' };

function openModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalBackdrop').classList.add('is-open');
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('is-open');
  document.getElementById('modalBox').innerHTML = '';
}
document.getElementById('modalBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modalBackdrop') closeModal();
});

// ---------- Abas ----------

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.panel-section');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`.panel-section[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
    });
  });
}

// ---------- Links (ferramenta / documento / manual) ----------

async function loadLinksTable(category) {
  const wrap = document.querySelector(`.table-wrap[data-table="${category}"]`);
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch(`/api/links?category=${category}`, { credentials: 'same-origin' });
  const data = await res.json();
  const items = data.links || [];

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Título</th><th>URL</th><th>Ordem</th><th></th></tr></thead>
      <tbody>
        ${items.length ? items.map((it) => `
          <tr>
            <td>${escapeHtml(it.title)}</td>
            <td class="muted-url" title="${escapeAttr(it.url)}">${escapeHtml(it.url)}</td>
            <td>${it.sort_order}</td>
            <td class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit="${it.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete="${it.id}">Excluir</button>
            </td>
          </tr>
        `).join('') : `<tr><td colspan="4" style="color:var(--muted)">Nenhum item cadastrado.</td></tr>`}
      </tbody>
    </table>
    <form class="inline-form" data-add-form="${category}">
      <div class="field field--full">
        <label>Título</label>
        <input type="text" data-field="title" required>
      </div>
      <div class="field">
        <label>URL</label>
        <input type="url" data-field="url" placeholder="https://" required>
      </div>
      <div class="field">
        <label>Ordem de exibição</label>
        <input type="number" data-field="sort_order" value="${items.length + 1}">
      </div>
      <div class="field field--full">
        <label>Descrição (opcional)</label>
        <input type="text" data-field="description">
      </div>
      <div class="inline-form__actions">
        <button type="submit" class="btn btn--accent btn--sm">Adicionar item</button>
      </div>
      <div class="form-msg" data-add-msg style="grid-column:1/-1"></div>
    </form>
  `;

  wrap.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteLink(btn.dataset.delete, category));
  });
  wrap.querySelectorAll('[data-edit]').forEach((btn) => {
    const item = items.find((i) => String(i.id) === btn.dataset.edit);
    btn.addEventListener('click', () => openEditLinkModal(item, category));
  });

  const addForm = wrap.querySelector(`[data-add-form="${category}"]`);
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = addForm.querySelector('[data-add-msg]');
    msgEl.className = 'form-msg';
    const payload = {
      category,
      title: addForm.querySelector('[data-field="title"]').value.trim(),
      url: addForm.querySelector('[data-field="url"]').value.trim(),
      sort_order: Number(addForm.querySelector('[data-field="sort_order"]').value) || 0,
      description: addForm.querySelector('[data-field="description"]').value.trim(),
    };
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar item.');
      await loadLinksTable(category);
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function openEditLinkModal(item, category) {
  openModal(`
    <h3>Editar item</h3>
    <p class="muted">Categoria: ${CATEGORY_LABEL[category]}</p>
    <div id="editLinkMsg" class="form-msg"></div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="editTitle" value="${escapeAttr(item.title)}">
    </div>
    <div class="field">
      <label>URL</label>
      <input type="url" id="editUrl" value="${escapeAttr(item.url)}">
    </div>
    <div class="field">
      <label>Ordem de exibição</label>
      <input type="number" id="editOrder" value="${item.sort_order}">
    </div>
    <div class="field">
      <label>Descrição (opcional)</label>
      <input type="text" id="editDesc" value="${escapeAttr(item.description || '')}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditLink" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditLink" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditLink').addEventListener('click', closeModal);
  document.getElementById('saveEditLink').addEventListener('click', async () => {
    const msgEl = document.getElementById('editLinkMsg');
    try {
      const res = await fetch(`/api/links/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          category,
          title: document.getElementById('editTitle').value.trim(),
          url: document.getElementById('editUrl').value.trim(),
          sort_order: Number(document.getElementById('editOrder').value) || 0,
          description: document.getElementById('editDesc').value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadLinksTable(category);
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteLink(id, category) {
  openModal(`
    <h3>Excluir item</h3>
    <p class="muted">Esta ação não pode ser desfeita. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/links/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadLinksTable(category);
  });
}

// ---------- Usuários ----------

async function loadUsersTable() {
  const wrap = document.getElementById('usersTableWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/users', { credentials: 'same-origin' });
  const data = await res.json();
  const users = data.users || [];

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nome</th><th>Usuário</th><th>Papel</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.username)}</td>
            <td><span class="badge ${u.role === 'admin' ? 'badge--admin' : 'badge--user'}">${u.role === 'admin' ? 'Administrador' : 'Usuário'}</span></td>
            <td>${u.active ? '<span class="badge badge--user">Ativo</span>' : '<span class="badge badge--inactive">Inativo</span>'}</td>
            <td class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit-user="${u.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete-user="${u.id}">Excluir</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-edit-user]').forEach((btn) => {
    const u = users.find((x) => String(x.id) === btn.dataset.editUser);
    btn.addEventListener('click', () => openEditUserModal(u));
  });
  wrap.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.deleteUser));
  });
}

function openEditUserModal(u) {
  openModal(`
    <h3>Editar usuário</h3>
    <p class="muted">${escapeHtml(u.username)}</p>
    <div id="editUserMsg" class="form-msg"></div>
    <div class="field">
      <label>Nome completo</label>
      <input type="text" id="editUName" value="${escapeAttr(u.name)}">
    </div>
    <div class="field">
      <label>Papel</label>
      <select id="editURole">
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuário</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
      </select>
    </div>
    <div class="field">
      <label><input type="checkbox" id="editUActive" ${u.active ? 'checked' : ''} style="width:auto;margin-right:6px"> Usuário ativo</label>
    </div>
    <div class="field">
      <label>Nova senha (opcional)</label>
      <input type="text" id="editUPassword" placeholder="Deixe em branco para manter a atual" minlength="8">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditUser" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditUser" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditUser').addEventListener('click', closeModal);
  document.getElementById('saveEditUser').addEventListener('click', async () => {
    const msgEl = document.getElementById('editUserMsg');
    const newPassword = document.getElementById('editUPassword').value;
    if (newPassword && newPassword.length < 8) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = 'A nova senha deve ter pelo menos 8 caracteres.';
      return;
    }
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: document.getElementById('editUName').value.trim(),
          role: document.getElementById('editURole').value,
          active: document.getElementById('editUActive').checked,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadUsersTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteUser(id) {
  openModal(`
    <h3>Excluir usuário</h3>
    <p class="muted">Esta ação não pode ser desfeita. O usuário perderá o acesso imediatamente. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    closeModal();
    if (!res.ok && data.error) {
      openModal(`<h3>Não foi possível excluir</h3><p class="muted">${escapeHtml(data.error)}</p><div class="modal__actions"><button class="btn btn--accent btn--sm" id="okClose" type="button">Entendi</button></div>`);
      document.getElementById('okClose').addEventListener('click', closeModal);
    } else {
      await loadUsersTable();
    }
  });
}

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addUserMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: document.getElementById('uName').value.trim(),
        username: document.getElementById('uUsername').value.trim(),
        password: document.getElementById('uPassword').value,
        role: document.getElementById('uRole').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário.');
    document.getElementById('addUserForm').reset();
    msgEl.className = 'form-msg is-ok';
    msgEl.textContent = 'Usuário criado com sucesso.';
    await loadUsersTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

// ---------- Minha conta ----------

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('changePassMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        currentPassword: document.getElementById('curPass').value,
        newPassword: document.getElementById('newPass').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao trocar senha.');
    msgEl.className = 'form-msg is-ok';
    msgEl.textContent = 'Senha alterada com sucesso.';
    document.getElementById('changePasswordForm').reset();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

// ---------- Inicialização ----------

(async () => {
  const user = await initPortalChrome('admin');
  if (!user) return;

  if (user.role !== 'admin') {
    document.getElementById('notAdminMsg').style.display = 'block';
    return;
  }

  document.getElementById('adminShell').style.display = 'flex';
  setupTabs();
  loadLinksTable('ferramenta');
  loadLinksTable('documento');
  loadLinksTable('manual');
  loadUsersTable();
})();
