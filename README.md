# Portal Saúde Cajamar

Versão do pacote: **2.11.1**  
Banco compartilhado: **Cloudflare D1 `portal-saude-db`**  
Plataforma: **Cloudflare Pages + Pages Functions + D1**

A versão 2.11.0 transforma o Apoio APS Cajamar no ponto central de autenticação para aplicações externas confiáveis. O handoff deixa de aceitar URLs externas arbitrárias e passa a usar aplicações cadastradas por `app_key`, mantendo o login existente do Portal.

## 2.11.1 — desindexação e reforço de legitimidade do acesso

- adiciona `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` para todo o Portal;
- mantém o rastreamento permitido para que mecanismos de busca consigam ler a diretiva `noindex` e reavaliar a segurança;
- remove o sitemap público como fonte de descoberta de páginas;
- aplica `Cache-Control: no-store` às páginas de autenticação e solicitação de acesso;
- reforça a identificação institucional do login e do cadastro público;
- informa de forma transparente que a hospedagem atual é feita em `apoioapscajamar.pages.dev` pela Cloudflare Pages;
- adiciona páginas públicas de Política de Privacidade e Termos de Uso, ambas desindexadas;
- reduz dependências externas nas páginas de autenticação e ajusta a CSP para o Turnstile;
- deixa explícito que o Portal não exige instalação de programas, extensões ou aplicativos;
- não altera banco de dados, credenciais, permissões nem o handoff 2.11.0.


## Estrutura

```text
portal-saude-cajamar/
├── assets/                  # imagens e identidade visual
├── css/                     # estilos
├── js/                      # JavaScript do frontend
├── functions/               # backend Cloudflare Pages Functions
│   ├── api/
│   └── receituario/
├── database/
│   ├── schema.sql           # banco novo no estado atual
│   ├── update.sql           # atualização consolidada de banco existente
│   ├── migrations/          # migrations incrementais
│   │   └── legacy/          # migrations históricas preservadas
│   └── archive/             # arquivos antigos somente para histórico
├── docs/
│   ├── instalacao/          # guias de instalação e integrações
│   ├── historico/           # AJUSTES antigos
│   └── NOVIDADES.md         # changelog consolidado
├── receituario/             # páginas do receituário
├── *.html                   # páginas públicas; mantidas na raiz por compatibilidade de URL
├── _headers
├── wrangler.toml
└── README.md
```

## Antes de reimplantar

Leia primeiro:

**`docs/instalacao/REIMPLANTE_V2.10.1.md`** (base de reimplante) e a migration `database/migrations/011_auth_clients_handoff.sql`

O reimplante não deve apagar nem recriar o `portal-saude-db` existente.

## Banco D1

### Instalação nova

```bash
wrangler d1 create portal-saude-db
wrangler d1 execute portal-saude-db --remote --file=./database/schema.sql
```

Depois configure o `database_id` em `wrangler.toml`.

### Atualização do banco que já está em produção

Se o Portal atual já está na linha **2.9.x** e suas migrations anteriores já foram aplicadas, **não rode novamente `database/update.sql`**. Esse arquivo é consolidado e contém alterações históricas que não são idempotentes.

Se a base já está em 2.10.1, aplique apenas:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/011_auth_clients_handoff.sql
```

Se ainda estiver antes da 2.10.1, aplique primeiro a `010_producao_apoio_clinico.sql` e depois a `011_auth_clients_handoff.sql`.

O arquivo `database/update.sql` foi preservado para cenários de atualização a partir de bases antigas e deve ser usado somente após conferir a versão de origem.

## Deploy

```bash
wrangler pages deploy . --project-name=portal-saude-cajamar
```

Se o projeto estiver conectado ao GitHub no Cloudflare Pages, o deploy pode ocorrer automaticamente após o merge/push para a branch configurada.

## Autenticação e permissões

- O Apoio APS Cajamar é a fonte central de autenticação para as plataformas integradas. Cada plataforma mantém sua própria sessão e suas próprias regras operacionais.
- Senhas são armazenadas por hash, nunca em texto puro.
- Senha temporária pode exigir troca no primeiro acesso.
- O Super Administrador controla acesso aos ambientes externos.
- Um usuário pode possuir múltiplas responsabilidades dentro de cada ambiente.
- Ambientes externos devem respeitar as unidades relacionadas ao usuário no Portal.

## Ambientes externos

Cada ambiente possui código/repositório e URL próprios:

- **eMulti / Regulação**
- **Produção**
- **Apoio Clínico / IA**

O acesso entre plataformas usa handoff de uso único vinculado a uma `app_key` cadastrada em Administração → Aplicações integradas. O domínio de destino é resolvido pelo backend e nunca é recebido livremente pela página de login.

Consulte:

- `docs/instalacao/INSTALL_REGULACAO.md`
- `docs/instalacao/INSTALAR_NOVOS_AMBIENTES.md`


## Integrar uma nova plataforma

1. Cadastre a plataforma em **Administração → Aplicações integradas** com uma `app_key`, origem HTTPS, callback e destino padrão.
2. A plataforma envia o usuário para `https://apoioapscajamar.pages.dev/login.html?app=<app_key>&dest=<caminho-interno>`.
3. Após autenticar, o Apoio APS emite um token de uso único vinculado à aplicação e redireciona para o callback cadastrado.
4. O backend da plataforma consome o token com `POST /api/handoff/consume`, enviando `token` e sua própria `app_key`, cria sua sessão local e aplica suas regras próprias de autorização.

O Portal centraliza **autenticação e identidade**. Cada aplicação continua responsável por suas permissões e dados operacionais. A tela de login não aceita domínio externo informado pelo navegador.

## Ouvidoria IA

A configuração administrativa do OuvidorSUS continua integrada ao Portal. Consulte:

`docs/instalacao/INTEGRACAO_OUVIDORIA.md`

## Documentação e histórico

A raiz do projeto deve permanecer focada nos arquivos que participam diretamente do deploy. Documentação fica em `docs/`; scripts de banco ficam em `database/`.

Para ver o histórico de versões:

`docs/NOVIDADES.md`
