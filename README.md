# Portal Saúde Cajamar

Intranet com login/senha para disponibilizar Ferramentas, Documentos Úteis e Manuais de Uso
à equipe da Secretaria de Saúde de Cajamar. Feito para rodar 100% no Cloudflare:
**Cloudflare Pages** (frontend + Functions) + **Cloudflare D1** (banco de dados, usuários e conteúdo).

## Estrutura do projeto

```
/index.html          → redireciona para /login.html ou /portal.html
/login.html          → tela de login
/portal.html          → página inicial (home) do portal
/documentos.html      → lista de Documentos Úteis
/manuais.html         → lista de Manuais de Uso
/admin.html           → painel do administrador (Ferramentas, Documentos, Manuais, Usuários)
/css/style.css
/js/common.js         → autenticação e menu, usados em todas as páginas
/js/admin.js          → lógica do painel admin
/assets/logo.png       → logotipo enviado
/functions/api/*       → backend (Cloudflare Pages Functions)
/schema.sql            → schema inicial do banco D1 (com usuário admin de exemplo)
/wrangler.toml
```

## 1. Criar o banco de dados D1

```bash
wrangler d1 create portal-saude-db
```

Isso devolve um `database_id`. Copie esse valor e cole em `wrangler.toml`, no lugar de
`COLE_AQUI_O_ID_DO_BANCO_D1`.

Depois, crie as tabelas e os dados iniciais:

```bash
wrangler d1 execute portal-saude-db --remote --file=./schema.sql
```

Isso cria o usuário administrador inicial:

- **login:** `admin`
- **senha:** `Cajamar@2026`

> ⚠️ Troque essa senha assim que fizer o primeiro acesso, em **Administração → Minha Conta**.

Em seguida, rode também a migração do modelo de permissões por funcionalidade (necessária para a
aba **Administração → Perfis de acesso** funcionar; sem ela o sistema roda normalmente, mas com
todas as funcionalidades liberadas para todo mundo, já que ainda não existe teto configurado):

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_permissions.sql
```

> ⚠️ Rode este arquivo só uma vez (veja o comentário no topo do arquivo para o que fazer se ele
> for executado por engano uma segunda vez).

Rode também a migração de segurança (rate limiting de login e trilha de auditoria). Ela é
aditiva (`CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS`), então pode ser executada
com segurança mesmo em um banco que já esteja em produção:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_security.sql
```

Isso cria:
- `login_attempts` — histórico de tentativas de login, usado para bloquear temporariamente
  (429) após 5 falhas seguidas para o mesmo usuário ou 20 falhas vindas do mesmo IP em 15 min.
- `audit_log` — quem criou/editou/excluiu usuários, links, permissões e aprovações de cadastro
  (consulte via `GET /api/audit-log`, restrito ao Super Administrador).
- Um índice em `sessions(user_id)`, usado para invalidar sessões rapidamente ao trocar senha,
  desativar ou excluir um usuário.

### CAPTCHA no formulário público de solicitação de acesso (opcional)

`/solicitar-acesso.html` é público (não exige login). Ele já suporta um CAPTCHA do
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) para impedir envios
automatizados (spam de solicitações e tentativas de descobrir usernames já cadastrados), mas
isso é **totalmente opcional** — sem configurar nada, o widget não aparece e o formulário
funciona normalmente sem CAPTCHA.

Para ativar (leva ~2 minutos, é grátis):

1. No **Cloudflare Dashboard → Turnstile → Add site**, escolha o modo "Managed" e copie a
   **Site Key** gerada.
2. Abra `solicitar-acesso.html` e preencha a constante `TURNSTILE_SITE_KEY` (perto do topo do
   `<script>`, hoje vazia: `const TURNSTILE_SITE_KEY = '';`) com essa Site Key.
3. No **Cloudflare Dashboard → Pages → portal-saude-cajamar → Settings → Environment variables**,
   adicione `TURNSTILE_SECRET_KEY` com a Secret Key correspondente (produção e preview) — essa
   é a parte que fica no servidor e nunca deve ir para o HTML/código do front-end.

Enquanto `TURNSTILE_SITE_KEY` estiver vazio (padrão) ou `TURNSTILE_SECRET_KEY` não estiver
configurada, a verificação é pulada dos dois lados automaticamente.

## 2. Criar o projeto no Cloudflare Pages

Se ainda não existir:

```bash
wrangler pages project create portal-saude-cajamar
```

## 3. Conectar o banco D1 ao projeto Pages

Como o projeto já usa `wrangler.toml` com o binding `DB`, o deploy via Wrangler CLI já
associa o banco automaticamente. Se preferir conferir/ajustar pelo painel:

**Cloudflare Dashboard → Pages → portal-saude-cajamar → Settings → Functions → D1 database bindings**
→ Variable name: `DB` → Database: `portal-saude-db` (marque para produção e preview).

## 4. Deploy

Na raiz do projeto:

```bash
wrangler pages deploy . --project-name=portal-saude-cajamar
```

Ao final, o Wrangler mostra a URL pública (algo como `https://portal-saude-cajamar.pages.dev`).

Para atualizar o portal no futuro, basta editar os arquivos e rodar o mesmo comando de deploy
novamente.

## 5. Domínio próprio (opcional)

Em **Pages → portal-saude-cajamar → Custom domains**, adicione, por exemplo,
`saude-intranet.cajamar.sp.gov.br` (o domínio precisa estar no Cloudflare). O HTTPS é
provisionado automaticamente — importante porque o login usa cookies `Secure`.

## 6. Primeiro acesso

1. Acesse a URL do portal.
2. Entre com `admin` / `Cajamar@2026`.
3. Vá em **Administração → Minha Conta** e troque a senha.
4. Em **Administração → Usuários**, cadastre as pessoas autorizadas (defina quem é
   Administrador e quem é Usuário comum).
5. Em **Administração → Ferramentas / Documentos Úteis / Manuais de Uso**, cadastre os
   links reais (as três ferramentas já vêm criadas com URLs de exemplo — edite-as).

## Como funciona o controle de acesso

- Qualquer usuário logado (comum ou administrador) consegue ver as Ferramentas, Documentos
  Úteis e Manuais de Uso.
- Somente usuários com papel **Administrador** enxergam e acessam o menu **Administração**,
  e apenas eles conseguem criar/editar/excluir links e usuários — essa regra é aplicada tanto
  na tela quanto no backend (as rotas `/api/links` e `/api/users` para criar, editar e excluir
  exigem sessão de administrador).
- As senhas nunca são guardadas em texto puro: são armazenadas com hash PBKDF2-SHA256 (100.000
  iterações) + salt aleatório por usuário.
- A sessão fica em um cookie `HttpOnly` + `Secure`, válido por 8 horas.
- Quando um administrador define uma nova senha para alguém em **Administração → Usuários**
  (ex.: recuperação de acesso), por padrão essa senha é tratada como temporária: a pessoa é
  obrigada a trocá-la no próximo login (tela `/trocar-senha-obrigatoria.html`). O administrador
  pode desmarcar a opção "Exigir troca de senha no próximo login" nesse mesmo formulário se quiser
  definir uma senha definitiva diretamente.

## Testar localmente antes do deploy (opcional)

```bash
wrangler pages dev . --d1=DB=portal-saude-db --local
```

Como o ambiente local roda em `http://127.0.0.1`, o cookie `Secure` pode ser bloqueado pelo
navegador. Se isso acontecer só em ambiente de testes, remova temporariamente `; Secure` da
função `sessionCookieHeader` em `functions/api/_utils.js` — lembre-se de desfazer antes do
deploy em produção.

## Personalização rápida

- **Cor do menu superior:** variável `--primary` em `css/style.css` (já definida como `#203b8f`).
- **Logotipo:** substitua `assets/logo.png` (mantenha fundo branco).
- **Textos das páginas:** editar diretamente os arquivos `.html` correspondentes.

### Aparência compartilhada com eMulti
A versão 2.3 adiciona Claro, Escuro, Alto contraste e Automático. A preferência é armazenada em `users.theme` e compartilhada com o módulo eMulti. Execute `migration_theme_v3.sql` uma única vez no `portal-saude-db`.

## Integração eMulti v2.6 — permissão individual

A partir da v2.6, `regulacao_vagas` é uma permissão **individual**, independente do papel (`user`, `admin_unidade`, `admin`) no Portal. Ela indica apenas se o usuário pode abrir o eMulti. As responsabilidades internas — Cadastrante, Regulador, Executor e Administrador — são configuradas no próprio eMulti.

Execute no `portal-saude-db`:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_acessos_v2_6.sql
```
