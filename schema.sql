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
role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','super_admin','admin_unidade')),
  active INTEGER NOT NULL DEFAULT 1,
  -- Quando 1, o usuário é obrigado a trocar a senha no próximo login (usado
  -- quando o admin define uma senha temporária, ex.: recuperação de acesso).
  must_change_password INTEGER NOT NULL DEFAULT 0,
  -- Unidade de lotação (texto livre, informativo). NÃO tem relação com o
  -- campo de unidade usado no Receituário (ver user_unidades).
  unidade TEXT,
  -- Preferência de aparência compartilhada entre Portal e eMulti.
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('auto','light','dark','contrast')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índice para acelerar a invalidação de sessões de um usuário (troca de
-- senha, exclusão de conta) e a limpeza periódica de sessões expiradas.
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Registro de tentativas de login (sucesso e falha), usado para aplicar um
-- bloqueio temporário por usuário/IP após várias falhas seguidas e conter
-- ataques de força bruta. Ver checkLoginRateLimit()/recordLoginAttempt() em
-- functions/api/_utils.js.
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_login_attempts_username_time ON login_attempts(username, created_at);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, created_at);

-- Trilha de auditoria: quem fez o quê (criação/edição/exclusão de usuários,
-- links, permissões, aprovações de cadastro etc.), para investigação futura.
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

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

-- Cadastro das unidades de saúde (postos/UBS/UPA/etc.) usadas no Receituário.
-- Fonte única de verdade: tanto o seletor de unidade do Receituário quanto as
-- telas de atribuição (Unidades (Receituário) e Unidades que gerencia, na
-- aba Usuários) leem daqui. Cadastro de novas unidades é restrito ao Super
-- Administrador (Administração > Unidades).
CREATE TABLE unidades (
  code TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cnes TEXT,
  endereco TEXT,
  tel TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
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

-- Quais unidades cada administrador de unidade (admin_unidade) pode gerenciar.
-- Um mesmo admin_unidade pode cobrir várias unidades. Super Admin gerencia isso.
CREATE TABLE admin_unidades (
  admin_user_id INTEGER NOT NULL,
  unidade TEXT NOT NULL,
  PRIMARY KEY (admin_user_id, unidade),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Relatórios (dashboards) exibidos na aba Relatórios, com controle de acesso
-- por "grupos de acesso" (ponte entre usuários e relatórios).
CREATE TABLE report_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  embed_url TEXT NOT NULL,
  -- 'embed': mostra dentro do próprio portal (iframe). 'new_tab': abre o link em nova aba.
  display_mode TEXT NOT NULL DEFAULT 'embed' CHECK (display_mode IN ('embed','new_tab')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE report_group_reports (
  group_id INTEGER NOT NULL,
  report_id INTEGER NOT NULL,
  PRIMARY KEY (group_id, report_id),
  FOREIGN KEY (group_id) REFERENCES report_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE user_report_groups (
  user_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES report_groups(id) ON DELETE CASCADE
);

-- Unidades de saúde iniciais (mesmos códigos usados historicamente no Receituário)
INSERT INTO unidades (code, nome, cnes, endereco, tel, sort_order) VALUES
('upa', 'UPA 24h Vereador Luiz dos Santos Faria', '7068824', 'Rua Alfredo Del''Vigna, 253 - Jordanésia, Cajamar/SP', '(11) 4447-4058', 1),
('policlinica', 'Policlínica Municipal de Cajamar', '4982037', 'Av. Dr. Antonio João Abdalla, 1500 - Cristais, Cajamar/SP', '(11) 4446-0100', 2),
('cer2', 'Centro Especializado em Reabilitação CER II', '5204887', 'Av. Dr. Antonio João Abdalla, 1500 - Cristais, Cajamar/SP', '(11) 4446-0100', 3),
('portal', 'ESF Carlos dos Santos', '968358', 'Rua das Cravinas, 198 - Portal Ipês III, Cajamar/SP', '(11) 4446-0124', 4),
('km43', 'Posto de Saúde Nadília de Oliveira Santos', '5270006', 'Rua Bela Vista, 1200 - São Benedito, Cajamar/SP', '(11) 4446-0115', 5),
('beloplanalto', 'PSF Belo Planalto', '3672891', 'Rua Nercílio José dos Santos, 58 - Polvilho, Cajamar/SP', '(11) 4446-0112', 6),
('marialuiza', 'PSF Dra. Maria de Lourdes Mendonça Bravo', '2096269', 'Av. Arujá, 208 - Colina Maria Luíza, Cajamar/SP', '(11) 4446-0116', 7),
('guaturinho', 'PSF Edivaldo Soares Massagardi', '7068840', 'Rua Barueri, 198 - Guaturinho, Cajamar/SP', '(11) 4446-0111', 8),
('parquesaoroberto', 'UBS Enf. Leontina Martins França', '2096242', 'Av. Dr. José Luíz Leme Maciel, 179 - Jordanésia, Cajamar/SP', '(11) 4446-0109', 9),
('ponunduva', 'USF Maria Aparecida Missé', '2096226', 'Rua Joaquim Rodrigues Pontes, 203 - Ponunduva, Cajamar/SP', '(11) 4446-0114', 10),
('cajamarcento', 'USF Vereador Joaquim Alves de Castro', '2096161', 'Av. Prof. Walter Ribas de Andrade, 544 - Água Fria, Cajamar/SP', '(11) 4446-0110', 11),
('jordanesia', 'UBS Enfermeiro Carlos Moreira da Silva', '2096234', 'Av. Antônio Cândido Machado, 1769 - Jordanésia, Cajamar/SP', '(11) 4446-0107', 12),
('polvilho', 'UBS Dra. Izabel Gratieri', '2096188', 'Rua Timburi, 121 - Panorama I - Polvilho, Cajamar/SP', '(11) 4446-0108', 13),
('manoelinacio', 'USF Manoel Inácio da Silva', '3437280', 'Av. das Juritis, 385 - Pq. Maria Aparecida, Cajamar/SP', '(11) 4446-0117', 14),
('ceo', 'Centro de Especialidades Odontológicas', '4075773', 'Av. Dr. Antonio João Abdalla, 1500 - 2º andar - Cristais, Cajamar/SP', '(11) 4446-0117', 15),
('caps', 'CAPS Cajamar', '9077618', 'Rua Rita Maria de Jesus, 20 - Polvilho, Cajamar/SP', '(11) 4446-0121', 16),
('capsij', 'CAPS Infanto/Juvenil', '499889', 'Rua das Moréias, 55 - Portal 3 - Polvilho, Cajamar/SP', '(11) 4446-0122', 17);

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
