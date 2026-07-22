-- Portal Saúde Cajamar — schema do banco D1
-- Rode com: wrangler d1 execute portal-saude-db --file=./schema.sql

DROP TABLE IF EXISTS user_unidades;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS updates;
DROP TABLE IF EXISTS signup_requests;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  -- 'user': acesso comum. 'admin': gerencia conteúdo e usuários comuns.
  -- 'super_admin': tudo que 'admin' faz, além de criar/editar/excluir outros
  -- administradores (só ele pode mexer em contas 'admin'/'super_admin').
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','super_admin')),
  active INTEGER NOT NULL DEFAULT 1,
  -- Quando 1, o usuário é obrigado a trocar a senha no próximo login (usado
  -- quando o admin define uma senha temporária, ex.: recuperação de acesso).
  must_change_password INTEGER NOT NULL DEFAULT 0,
  -- Unidade de lotação (texto livre, informativo). NÃO tem relação com o
  -- campo de unidade usado no Receituário (ver user_unidades).
  unidade TEXT,
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
  open_mode TEXT NOT NULL DEFAULT '_blank' CHECK (open_mode IN ('_blank','_self')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Atualizações/novidades exibidas na home do portal (/portal.html).
CREATE TABLE updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  link_url TEXT,
  link_label TEXT,
  published_at TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Solicitações de cadastro enviadas pela tela pública /solicitar-acesso.html.
-- A senha já entra com hash aqui (nunca guardamos senha em texto puro),
-- e só vira um usuário de verdade quando um administrador aprova.


CREATE TABLE signup_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  unidade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by INTEGER,
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Permissões de acesso ao Receituário: quais unidades (postos/UBS) cada
-- usuário do tipo 'user' pode ver/emitir receitas. Administradores
-- enxergam automaticamente TODAS as unidades e não precisam de linhas aqui.
CREATE TABLE user_unidades (
  user_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  PRIMARY KEY (user_id, unidade_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usuário administrador inicial (já como super_admin)
-- login: admin   senha: Cajamar@2026  (ALTERE assim que fizer o primeiro acesso, em Administração > Usuários)
INSERT INTO users (username, name, password_hash, salt, role) VALUES
('admin', 'Administrador do Portal', '6a6903b4f1902717a02fbcb8a771b96e8a0083bf41c01fc0e1ac23fa31b08850', '58528e6c84c7a12e23c4b0263fd8ed1f', 'super_admin');

-- Itens iniciais do menu Ferramentas
INSERT INTO links (category, title, url, sort_order) VALUES
('ferramenta', 'Malotes e Remessas', '/guiasmalotes', 1),
('ferramenta', 'Prescrições', '/receituario/', 2),
('ferramenta', 'FacilitaWhats', '/facilitawhats', 3);

-- Avisos iniciais de exemplo (edite ou exclua em Administração > Atualizações)
INSERT INTO updates (title, body, tag, published_at) VALUES
('Bem-vindo(a) ao novo Portal Saúde', 'Esta página agora mostra os avisos e novidades da Secretaria. As ferramentas, documentos e manuais continuam no menu superior.', 'Sistema', date('now'));
