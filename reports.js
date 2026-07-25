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
