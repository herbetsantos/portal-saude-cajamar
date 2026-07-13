// Funções compartilhadas entre as páginas do portal (exceto login.html).

async function requireLogin() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = '/login.html';
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function renderTopbarUser(user) {
  const chip = document.getElementById('userChip');
  if (!chip) return;
  chip.innerHTML = `
    <span class="user-chip__avatar">${initials(user.name)}</span>
    <span>${user.name}</span>
  `;
  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login.html';
  });
}

function setupFerramentasDropdown() {
  const trigger = document.getElementById('ferramentasTrigger');
  const menu = document.getElementById('ferramentasMenu');
  if (!trigger || !menu) return;

  const close = () => { trigger.classList.remove('is-open'); menu.classList.remove('is-open'); };
  const toggle = () => { trigger.classList.toggle('is-open'); menu.classList.toggle('is-open'); };

  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

async function loadFerramentasMenu() {
  const menu = document.getElementById('ferramentasMenu');
  if (!menu) return;
  try {
    const res = await fetch('/api/links?category=ferramenta', { credentials: 'same-origin' });
    const data = await res.json();
    const links = data.links || [];
    menu.innerHTML = links.length
      ? links.map((l) => `
          <a class="submenu__link" href="${escapeAttr(l.url)}" target="_blank" rel="noopener">
            <span class="cross">✚</span>${escapeHtml(l.title)}
          </a>`).join('')
      : `<div class="submenu__link" style="color:var(--muted)">Nenhuma ferramenta cadastrada</div>`;
  } catch {
    menu.innerHTML = `<div class="submenu__link" style="color:var(--muted)">Não foi possível carregar</div>`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

async function initPortalChrome() {
  const user = await requireLogin();
  if (!user) return null;
  renderTopbarUser(user);
  setupLogout();
  setupFerramentasDropdown();
  loadFerramentasMenu();
  return user;
}
