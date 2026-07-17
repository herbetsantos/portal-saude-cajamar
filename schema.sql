-- Portal Saúde Cajamar — schema do banco D1
-- Rode com: wrangler d1 execute portal-saude-db --file=./schema.sql

DROP TABLE IF EXISTS user_unidades;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('ferramenta','documento','manual')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Permissões de acesso ao Receituário: quais unidades (postos/UBS) cada
-- usuário do tipo 'user' pode ver/emitir receitas. Administradores (role='admin')
-- enxergam automaticamente TODAS as unidades e não precisam de linhas aqui.
-- O código da unidade (unidade_code) é o mesmo usado no <select id="unidade">
-- do receituário (ex.: 'polvilho', 'ponunduva', 'upa', etc.).
CREATE TABLE user_unidades (
  user_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  PRIMARY KEY (user_id, unidade_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usuário administrador inicial
-- login: admin   senha: Cajamar@2026  (ALTERE assim que fizer o primeiro acesso, em Administração > Usuários)
-- hash gerado com PBKDF2-SHA256 / 100000 iterações (ver /functions/api/_utils.js)
INSERT INTO users (username, name, password_hash, salt, role) VALUES
('admin', 'Administrador do Portal', '6a6903b4f1902717a02fbcb8a771b96e8a0083bf41c01fc0e1ac23fa31b08850', '58528e6c84c7a12e23c4b0263fd8ed1f', 'admin');

-- Itens iniciais do menu Ferramentas
INSERT INTO links (category, title, url, sort_order) VALUES
('ferramenta', 'Malotes e Remessas', 'https://apoioapscajamar.pages.dev/guiasmalotes', 1),
('ferramenta', 'Prescrições', '/receituario/', 2),
('ferramenta', 'FacilitaWhats', 'https://https://apoioapscajamar.pages.dev/facilitawhats', 3);