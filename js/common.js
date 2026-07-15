// Funções compartilhadas entre as páginas do portal (exceto login.html).

// Topbar única, compartilhada por todas as páginas. Antes esse HTML estava
// duplicado em cada arquivo .html; agora existe só aqui. Cada página só
// precisa ter <div id="app-topbar"></div> no lugar do <header> antigo.
const TOPBAR_HTML = `
<header class="topbar">
  <div class="topbar__left">
    <a class="brand" href="/portal.html"><img src="/assets/CAJAMAR PREFEITURA.png" alt="Prefeitura de Cajamar — Saúde"></a>
    <nav class="nav">
      <div class="nav__item">
        <button class="nav__link" id="ferramentasTrigger" type="button">
          <span class="label-text">FERRAMENTAS</span><span class="nav__caret"></span>
        </button>
        <div class="submenu" id="ferramentasMenu"></div>
      </div>
      <div class="nav__item">
        <a class="nav__link" data-nav="documentos" href="/documentos.html"><span class="label-text">DOCUMENTOS ÚTEIS</span></a>
      </div>
      <div class="nav__item">
        <a class="nav__link" data-nav="manuais" href="/manuais.html"><span class="label-text">MANUAIS DE USO</span></a>
      </div>
      <div class="nav__item">
        <a class="nav__link" data-nav="admin" id="adminLink" href="/admin.html" style="display:none"><span class="label-text">ADMINISTRAÇÃO</span></a>
      </div>
    </nav>
  </div>
  <div class="topbar__right">
    <div class="user-chip" id="userChip"></div>
    <button class="btn btn--ghost-light btn--sm" id="logoutBtn" type="button">Sair</button>
  </div>
</header>`;

// Injeta o topbar e marca visualmente o item ativo.
// activeKey: 'documentos' | 'manuais' | 'admin' | 'ferramentas' (usado pelas
// páginas de ferramenta, ex. FacilitaWhats, Guias e Malotes) | undefined (home).
function renderTopbar(activeKey) {
  const mount = document.getElementById('app-topbar');
  if (!mount) return;
  mount.innerHTML = TOPBAR_HTML;
  if (activeKey === 'ferramentas') {
    document.getElementById('ferramentasTrigger').style.background = 'rgba(255,255,255,0.14)';
  } else if (activeKey) {
    const el = mount.querySelector(`[data-nav="${activeKey}"]`);
    if (el) el.style.background = 'rgba(255,255,255,0.14)';
  }
}

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

async function initPortalChrome(activeKey) {
  renderTopbar(activeKey);
  const user = await requireLogin();
  if (!user) return null;
  renderTopbarUser(user);
  setupLogout();
  setupFerramentasDropdown();
  loadFerramentasMenu();
  return user;
}
