# Novidades do Portal Saúde Cajamar

## 2.11.0 — Autenticação central para múltiplas plataformas

- Novo cadastro de **Aplicações integradas** no painel do Super Administrador.
- Cada aplicação recebe uma `app_key`, origem HTTPS, callback e destino padrão.
- O login central recebe apenas `app` e um caminho interno `dest`; URLs externas arbitrárias deixam de ser aceitas.
- Tokens de handoff passam a ser vinculados à aplicação e ao destino e continuam de uso único e curta duração.
- Novo endpoint servidor-a-servidor `/api/handoff/consume` para que plataformas externas consumam o token sem ler diretamente o banco do Portal.
- Ferramentas externas podem ser associadas a uma aplicação integrada e recebem handoff automaticamente ao serem abertas pelo Portal.
- A eMulti é cadastrada automaticamente como primeiro cliente (`emulti`).

## 2.10.1 — Reorganização segura do repositório

- Documentação centralizada em `docs/`.
- Migrations históricas preservadas em `database/migrations/legacy/`.
- Scripts canônicos mantidos em `database/schema.sql` e `database/update.sql`.
- Migração de Produção/Apoio Clínico organizada como `database/migrations/010_producao_apoio_clinico.sql`.
- Páginas HTML mantidas na raiz para preservar URLs públicas existentes.
- Nenhuma funcionalidade do Portal foi removida.
- `schema.sql` passa a incluir explicitamente as permissões opt-in de Produção e Apoio Clínico para novas instalações.

## 2.10.0 — Produção e Apoio Clínico como ambientes independentes

- Mantida a base funcional do Portal Saúde 2.9.2.
- Novas permissões individuais `producao` e `apoio_clinico`.
- Somente o Super Administrador pode conceder ou remover acesso a esses ambientes.
- Os vínculos de unidade continuam pertencendo ao Portal e devem ser respeitados pelos módulos externos.
- O mesmo handoff de uso único utilizado pelo eMulti passa a servir os novos ambientes.

## 2.9.2 — Administração escalável

- Usuários carregados por página no backend.
- Quantidade por página: 10, 20, 50 ou 100 registros.
- Busca por nome ou login.
- Filtros combináveis por unidade, função e status.
- Paginação preserva as regras de escopo do Administrador de Unidade.

## 2.9.1 — Comunicação, chat, suporte e gestão integrada

- Presença online compartilhada entre Portal Saúde e eMulti.
- Identificação visual dos participantes no chat.
- Contadores de mensagens não lidas.
- Lista de atendimentos de suporte com presença e não lidas.
- Encerramento e reabertura de atendimentos pelo Super Administrador.
- Comunicação interna e suporte compartilhados entre Portal Saúde e eMulti.
- Retenção configurável pelo Super Administrador, com 30 dias como padrão.
- Chamados integrados ao suporte.
- Estrutura inicial do Assistente de Rotinas.
- Banco consolidado em `database/schema.sql` e `database/update.sql`.

## Histórico anterior

Os registros detalhados das versões anteriores foram preservados em `docs/historico/`.
