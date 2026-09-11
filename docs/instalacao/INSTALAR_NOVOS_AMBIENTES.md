# Aplicações externas no Apoio APS Cajamar 2.11.0

O Apoio APS Cajamar centraliza autenticação e identidade. Cada aplicação externa mantém sua própria sessão, permissões e dados operacionais.

## Preparação do Portal

Se o banco já está na versão 2.10.1, execute uma única vez:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/011_auth_clients_handoff.sql
```

Depois publique o Apoio APS Cajamar 2.11.0.

## Cadastrar uma aplicação

Em **Administração → Aplicações integradas**, informe:

- `app_key`: identificador estável, por exemplo `emulti`, `producao` ou `apoio_clinico`;
- nome da plataforma;
- origem HTTPS, sem caminho;
- caminho de callback que receberá o token;
- destino padrão após autenticação;
- situação ativa/inativa.

A eMulti é criada automaticamente pela migration 011 com a chave `emulti`.

## Fluxo de autenticação

A aplicação direciona o navegador para:

```text
https://apoioapscajamar.pages.dev/login.html?app=CHAVE&dest=/caminho/interno
```

O parâmetro `dest` deve ser apenas um caminho interno da aplicação. O domínio externo nunca é recebido pela página de login; ele é lido do cadastro seguro de aplicações no backend.

Após o login, o Apoio APS cria um token de uso único, vincula-o à `app_key` e ao destino e redireciona para o callback cadastrado. O backend da aplicação consome o token com:

```text
POST https://apoioapscajamar.pages.dev/api/handoff/consume
```

Corpo JSON:

```json
{
  "token": "TOKEN_RECEBIDO",
  "app_key": "CHAVE"
}
```

A resposta contém a identidade do usuário e o destino interno originalmente solicitado. A aplicação cria então sua própria sessão e aplica suas próprias regras de autorização.

## Link no menu Ferramentas

Se a plataforma também aparecer no menu do Apoio APS, cadastre/edite o link em **Administração → Ferramentas** e selecione a respectiva opção em **Login integrado**. O Portal emitirá o handoff automaticamente ao abrir o link.
