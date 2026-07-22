// Lógica da página admin.html

const CATEGORY_LABEL = { ferramenta: 'ferramenta', documento: 'documento', manual: 'manual' };
let currentUser = null;

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

// ---------- Atualizações (home) ----------

function fmtUpdateDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return (y && m && d) ? `${d}/${m}/${y}` : iso;
}

async function loadUpdatesTable() {
  const wrap = document.getElementById('updatesTableWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/updates', { credentials: 'same-origin' });
  const data = await res.json();
  const items = data.updates || [];

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Data</th><th>Título</th><th>Tag</th><th></th></tr></thead>
      <tbody>
        ${items.length ? items.map((it) => `
          <tr>
            <td>${escapeHtml(fmtUpdateDate(it.published_at))}</td>
            <td>${escapeHtml(it.title)}</td>
            <td>${it.tag ? `<span class="badge badge--admin">${escapeHtml(it.tag)}</span>` : ''}</td>
            <td class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit-update="${it.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete-update="${it.id}">Excluir</button>
            </td>
          </tr>
        `).join('') : `<tr><td colspan="4" style="color:var(--muted)">Nenhuma atualização publicada.</td></tr>`}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-delete-update]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteUpdate(btn.dataset.deleteUpdate));
  });
  wrap.querySelectorAll('[data-edit-update]').forEach((btn) => {
    const item = items.find((i) => String(i.id) === btn.dataset.editUpdate);
    btn.addEventListener('click', () => openEditUpdateModal(item));
  });
}

document.getElementById('addUpdateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addUpdateMsg');
  msgEl.className = 'form-msg';
  const payload = {
    title: document.getElementById('upTitle').value.trim(),
    body: document.getElementById('upBody').value.trim(),
    tag: document.getElementById('upTag').value.trim(),
    published_at: document.getElementById('upDate').value,
    link_url: document.getElementById('upLinkUrl').value.trim(),
    link_label: document.getElementById('upLinkLabel').value.trim(),
  };
  try {
    const res = await fetch('/api/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao publicar atualização.');
    document.getElementById('addUpdateForm').reset();
    await loadUpdatesTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

function openEditUpdateModal(item) {
  openModal(`
    <h3>Editar atualização</h3>
    <div id="editUpdateMsg" class="form-msg"></div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="editUpTitle" value="${escapeAttr(item.title)}">
    </div>
    <div class="field">
      <label>Texto</label>
      <textarea id="editUpBody" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit;resize:vertical">${escapeHtml(item.body)}</textarea>
    </div>
    <div class="field">
      <label>Categoria/tag (opcional)</label>
      <input type="text" id="editUpTag" value="${escapeAttr(item.tag || '')}">
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" id="editUpDate" value="${escapeAttr(item.published_at || '')}">
    </div>
    <div class="field">
      <label>Link/anexo (opcional)</label>
      <input type="url" id="editUpLinkUrl" value="${escapeAttr(item.link_url || '')}">
    </div>
    <div class="field">
      <label>Texto do link (opcional)</label>
      <input type="text" id="editUpLinkLabel" value="${escapeAttr(item.link_label || '')}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditUpdate" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditUpdate" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditUpdate').addEventListener('click', closeModal);
  document.getElementById('saveEditUpdate').addEventListener('click', async () => {
    const msgEl = document.getElementById('editUpdateMsg');
    try {
      const res = await fetch(`/api/updates/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: document.getElementById('editUpTitle').value.trim(),
          body: document.getElementById('editUpBody').value.trim(),
          tag: document.getElementById('editUpTag').value.trim(),
          published_at: document.getElementById('editUpDate').value,
          link_url: document.getElementById('editUpLinkUrl').value.trim(),
          link_label: document.getElementById('editUpLinkLabel').value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadUpdatesTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteUpdate(id) {
  openModal(`
    <h3>Excluir atualização</h3>
    <p class="muted">Esta ação não pode ser desfeita. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/updates/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadUpdatesTable();
  });
}

// ---------- Solicitações de cadastro ----------

async function loadSignupRequestsTable() {
  const wrap = document.getElementById('signupRequestsWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/signup-requests', { credentials: 'same-origin' });
  const data = await res.json();
  const items = data.requests || [];

  const badge = document.getElementById('pendingBadge');
  if (items.length > 0) {
    badge.style.display = '';
    badge.textContent = items.length;
  } else {
    badge.style.display = 'none';
  }

  wrap.innerHTML = items.length ? `
    <table class="data-table">
      <thead><tr><th>Data</th><th>Nome</th><th>Usuário</th><th>Unidade</th><th></th></tr></thead>
      <tbody>
        ${items.map((it) => `
          <tr>
            <td>${escapeHtml(fmtUpdateDate((it.created_at || '').slice(0, 10)))}</td>
            <td>${escapeHtml(it.name)}</td>
            <td>${escapeHtml(it.username)}</td>
            <td>${escapeHtml(it.unidade)}</td>
            <td class="row-actions">
              <button class="btn btn--accent btn--sm" data-approve="${it.id}">Aprovar</button>
              <button class="btn btn--danger btn--sm" data-reject="${it.id}">Rejeitar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div class="empty-state">Nenhuma solicitação pendente.</div>`;

  wrap.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => resolveSignupRequest(btn.dataset.approve, 'approve'));
  });
  wrap.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => resolveSignupRequest(btn.dataset.reject, 'reject'));
  });
}

function resolveSignupRequest(id, action) {
  if (action === 'reject') {
    openModal(`
      <h3>Rejeitar solicitação</h3>
      <p class="muted">A pessoa não será cadastrada. Deseja continuar?</p>
      <div class="modal__actions">
        <button class="btn btn--outline btn--sm" id="cancelReject" type="button">Cancelar</button>
        <button class="btn btn--danger btn--sm" id="confirmReject" type="button">Rejeitar</button>
      </div>
    `);
    document.getElementById('cancelReject').addEventListener('click', closeModal);
    document.getElementById('confirmReject').addEventListener('click', async () => {
      closeModal();
      await sendSignupResolution(id, 'reject');
    });
    return;
  }
  sendSignupResolution(id, 'approve');
}

async function sendSignupResolution(id, action) {
  try {
    const res = await fetch(`/api/signup-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao processar solicitação.');
    await loadSignupRequestsTable();
    if (action === 'approve') await loadUsersTable();
  } catch (err) {
    openModal(`<h3>Não foi possível concluir</h3><p class="muted">${escapeHtml(err.message)}</p><div class="modal__actions"><button class="btn btn--accent btn--sm" id="okClose" type="button">Entendi</button></div>`);
    document.getElementById('okClose').addEventListener('click', closeModal);
  }
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

function roleLabel(role) {
  if (role === 'super_admin') return 'Super Administrador';
  if (role === 'admin') return 'Administrador';
  return 'Usuário';
}
function roleBadgeClass(role) {
  return role === 'user' ? 'badge--user' : 'badge--admin';
}

async function loadUsersTable() {
  const wrap = document.getElementById('usersTableWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/users', { credentials: 'same-origin' });
  const data = await res.json();
  const users = data.users || [];
  const canManageAdmins = currentUser && currentUser.role === 'super_admin';

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nome</th><th>Usuário</th><th>Unidade</th><th>Papel</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => {
          const isAdminLevel = u.role === 'admin' || u.role === 'super_admin';
          const locked = isAdminLevel && !canManageAdmins;
          return `
          <tr>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.unidade || '—')}</td>
            <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
            <td>${u.active ? '<span class="badge badge--user">Ativo</span>' : '<span class="badge badge--inactive">Inativo</span>'}</td>
            <td class="row-actions">
              ${locked ? '<span class="muted" style="font-size:12.5px">Só Super Admin</span>' : `
                <button class="btn btn--outline btn--sm" data-edit-user="${u.id}">Editar</button>
                <button class="btn btn--outline btn--sm" data-unidades-user="${u.id}">Unidades (Receituário)</button>
                <button class="btn btn--danger btn--sm" data-delete-user="${u.id}">Excluir</button>
              `}
            </td>
          </tr>
        `;}).join('')}
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
  wrap.querySelectorAll('[data-unidades-user]').forEach((btn) => {
    const u = users.find((x) => String(x.id) === btn.dataset.unidadesUser);
    btn.addEventListener('click', () => openUnidadesModal(u));
  });
}

// ---------- Unidades do Receituário por usuário ----------

async function openUnidadesModal(u) {
  openModal(`
    <h3>Unidades do Receituário</h3>
    <p class="muted">${escapeHtml(u.name)} (${escapeHtml(u.username)})</p>
    <div id="unidadesMsg" class="form-msg"></div>
    <div id="unidadesList" class="skeleton-loading">Carregando…</div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelUnidades" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveUnidades" type="button" style="display:none">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelUnidades').addEventListener('click', closeModal);

  const listEl = document.getElementById('unidadesList');
  const saveBtn = document.getElementById('saveUnidades');
  const msgEl = document.getElementById('unidadesMsg');

  try {
    const res = await fetch(`/api/users/${u.id}/unidades`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar unidades.');

    if (data.role === 'admin') {
      listEl.innerHTML = `<p class="muted">Este usuário é administrador e já enxerga automaticamente <strong>todas</strong> as unidades. Não é necessário selecionar nada aqui.</p>`;
      saveBtn.style.display = 'none';
      return;
    }

    listEl.innerHTML = `
      <div class="checkbox-list">
        ${data.unidades.map((un) => `
          <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <input type="checkbox" value="${escapeAttr(un.code)}" ${un.atribuida ? 'checked' : ''} style="width:auto">
            ${escapeHtml(un.nome)}
          </label>
        `).join('')}
      </div>
      <p class="muted" style="margin-top:8px">Marque as unidades que ${escapeHtml(u.name)} poderá selecionar ao emitir receitas.</p>
    `;
    saveBtn.style.display = '';
    saveBtn.addEventListener('click', async () => {
      const codigos = [...listEl.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
      try {
        const putRes = await fetch(`/api/users/${u.id}/unidades`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ unidades: codigos }),
        });
        const putData = await putRes.json();
        if (!putRes.ok) throw new Error(putData.error || 'Erro ao salvar.');
        closeModal();
      } catch (err) {
        msgEl.className = 'form-msg is-error';
        msgEl.textContent = err.message;
      }
    });
  } catch (err) {
    listEl.innerHTML = '';
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
}

function openEditUserModal(u) {
  const canManageAdmins = currentUser && currentUser.role === 'super_admin';
  const roleOptions = canManageAdmins
    ? `
      <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuário</option>
      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
      <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Administrador</option>
    `
    : `<option value="user" selected>Usuário</option>`;

  openModal(`
    <h3>Editar usuário</h3>
    <p class="muted">${escapeHtml(u.username)}</p>
    <div id="editUserMsg" class="form-msg"></div>
    <div class="field">
      <label>Nome completo</label>
      <input type="text" id="editUName" value="${escapeAttr(u.name)}">
    </div>
    <div class="field">
      <label>Unidade de lotação</label>
      <input type="text" id="editUUnidade" value="${escapeAttr(u.unidade || '')}">
    </div>
    <div class="field">
      <label>Papel</label>
      <select id="editURole" ${canManageAdmins ? '' : 'disabled'}>
        ${roleOptions}
      </select>
      ${canManageAdmins ? '' : '<p class="muted" style="font-size:12.5px;margin-top:4px">Somente o Super Administrador pode alterar para Administrador.</p>'}
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
          unidade: document.getElementById('editUUnidade').value.trim(),
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
        unidade: document.getElementById('uUnidade').value.trim(),
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

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    document.getElementById('notAdminMsg').style.display = 'block';
    return;
  }

  currentUser = user;

  if (currentUser.role !== 'super_admin') {
    document.querySelectorAll('#uRole option[value="admin"], #uRole option[value="super_admin"]').forEach((opt) => opt.remove());
  }

  document.getElementById('adminShell').style.display = 'flex';
  setupTabs();
  loadUpdatesTable();
  loadSignupRequestsTable();
  loadLinksTable('ferramenta');
  loadLinksTable('documento');
  loadLinksTable('manual');
  loadUsersTable();
})();
