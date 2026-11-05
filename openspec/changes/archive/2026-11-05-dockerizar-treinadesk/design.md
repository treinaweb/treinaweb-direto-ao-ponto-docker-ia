# Design

## Context

Motivação em `proposal.md`; comportamento exigido em `specs/container-runtime/spec.md`.

`docker-ia/` não é um repositório git e contém dois repositórios independentes, `backend/` e `frontend/`. Fatos do código que moldam o design:

- **Backend**: NestJS 12 em ESM, Node >= 24.9, `.nvmrc` em 24.21.0. Prisma 7 com client gerado em `src/generated/prisma` (ignorado pelo git) e config em `prisma7.config.ts`.
- **Migrations e seed**: dependem de `prisma` e `tsx`, que são dependências de desenvolvimento. O seed importa `src/` como TypeScript e só grava dados de teste fora de `NODE_ENV=production`.
- **Rotas públicas**: `GET /` exige token, e `/docs-json` é pública. `PrismaService` chama `$connect()` no `onModuleInit`.
- **Frontend**: Next 16.4 como BFF. `API_BASE_URL` é lida sob demanda só no servidor, e os cookies são `Secure` com `NODE_ENV=production`. O refresh single-flight fica em memória de processo.

## Goals / Non-Goals

**Goals:**

- Imagens pequenas e reproduzíveis, construídas a partir dos `package-lock.json`.
- Nenhuma alteração no código da API e, no frontend, apenas a opção `output`.
- Falhas de configuração e de preparo do banco visíveis na própria subida.

**Non-Goals:**

- Endurecimento para produção real: o ambiente é local e usa usuários de teste com senha pública.
- Healthcheck profundo do banco na API, que exigiria uma rota nova.

## Decisions

### D1. Dockerfile multi-stage no backend, com targets `migrate` e `runtime`

```
base (node:24-slim)
  |
  +--> deps (npm ci, com dev) --> build (prisma generate + nest build)
  |                                  |
  |                                  +--> migrate  [target]
  |                                       prisma, tsx, prisma/, src/
  |
  +--> prod-deps (npm ci --omit=dev --omit=optional)
         |
         +--> runtime [target, padrao]  <-- dist/ copiado de build
              node dist/main.js, usuario node
```

`runtime` é o último estágio, para ser o padrão de um `docker build` sem `--target`. O client gerado entra em `dist/generated/prisma` pelo próprio `nest build`. `--omit=optional` é necessário porque `prisma` é peer opcional de `@prisma/client` e continuaria instalado só com `--omit=dev`.

*Alternativa rejeitada*: uma imagem só, com dependências de desenvolvimento. É mais simples, mas leva Prisma CLI, `tsx` e TypeScript para o processo da API.

### D2. Migração e seed em um serviço de execução única

O serviço `migrate` usa o target `migrate`, com `restart: "no"`, e executa `prisma migrate deploy` seguido de `prisma db seed`, ambos com `--config prisma7.config.ts`. A API depende dele com `service_completed_successfully`.

Só esse serviço recebe `NODE_ENV=development`, para o seed gravar os dados de teste. `backend` e `frontend` rodam com `NODE_ENV=production`.

*Alternativas rejeitadas*:
- **`pre_start` do Compose**: a documentação atual o prefere ao padrão de serviço único, mas ele herda a imagem do serviço por padrão, e aqui a imagem é outra. Um serviço próprio também pode ser reexecutado com `docker compose run --rm migrate` e funciona em versões anteriores do Compose.
- **Migrar no comando de início da API**: exigiria o Prisma CLI na imagem final e misturaria falha de migração com falha da API.

### D3. Sempre passar `--config` ao Prisma CLI

`prisma7.config.ts` não é o nome padrão documentado (`prisma.config.ts`). Passar a flag torna o comportamento independente da detecção automática e não exige renomear um arquivo citado na documentação do backend.

### D4. `prisma generate` no build, sem credencial real

`env("DATABASE_URL")` pode falhar sem a variável. Se falhar, o `RUN` define uma URL fictícia só naquele comando, sem `ENV` nem `ARG`, para que nada persista na imagem. O `generate` não acessa o banco.

### D5. Saída `standalone` no frontend

`output: "standalone"` no `next.config.ts`, com `public/` e `.next/static/` copiados para a imagem final e início por `node server.js`. Variáveis fixadas: `HOSTNAME=0.0.0.0`, `PORT=3000` e `NEXT_TELEMETRY_DISABLED=1`.

`HOSTNAME` é obrigatória porque o Docker a define com o id do container, e o servidor escutaria apenas nesse endereço, deixando o healthcheck e a porta publicada sem resposta em `localhost`.

*Alternativa rejeitada*: `next start` com `node_modules` completo. Dispensa a alteração no config, mas gera uma imagem bem maior.

### D6. Imagem base `node:24-slim`

Usada nas duas aplicações, em vez de Alpine, para evitar problemas de musl com o módulo nativo `argon2`. A tag `24-slim` foi confirmada no Docker Hub. A imagem final usa o usuário `node`, que já existe na imagem oficial.

### D7. Healthchecks sem ferramentas extras

| Serviço | Verificação | Motivo |
|---|---|---|
| `postgres` | `pg_isready` com usuário e banco | Já vem na imagem |
| `backend` | `node -e` com `fetch` em `/docs-json` | Rota pública. A imagem slim não tem `curl`. |
| `frontend` | `node -e` com `fetch` em `/login` | Rota de visitante, que não chama a API sem cookie |

O healthcheck da API não prova que consultas funcionam, mas o `$connect()` no boot e o `migrate` anterior reduzem essa lacuna.

### D8. PostgreSQL 18 com volume em `/var/lib/postgresql`

Imagem `postgres:18-alpine`, com volume nomeado `postgres-data` e sem `ports`. A partir da versão 18, a imagem oficial usa um `PGDATA` por versão sob `/var/lib/postgresql`, e por isso o volume é montado nesse diretório, não em `.../data`. Um cenário da spec verifica a persistência.

### D9. Configuração e segredos

`compose.yaml` e `.env` ficam na raiz, com `name: treinadesk-docker-ia` para fixar o nome do projeto e do volume. O nome `treinadesk` não é usado porque já pertence a outro projeto Compose nesta máquina (`treinaweb/ref/docker-ia`), e compartilhá-lo faria um projeto agir sobre os containers do outro.

| Variável | Tratamento |
|---|---|
| `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `ADMIN_PASSWORD` | Obrigatórias com `${VAR:?mensagem}` |
| `POSTGRES_USER`, `POSTGRES_DB`, `ADMIN_EMAIL` | Com padrão: `postgres`, `treinadesk`, `admin@treinadesk.local` |
| `DATABASE_URL` | Montada no compose para `migrate` e `backend` |
| `API_BASE_URL` | Fixa em `http://backend:3000` no compose |

Cada serviço recebe apenas o que usa: `ADMIN_*` só em `migrate`, `JWT_*` só em `backend`, e o frontend não recebe segredos. O `.env.example` orienta gerar valores com `openssl rand -hex`, que não exige Node e evita caracteres especiais na URL do banco.

### D10. Portas e `.dockerignore`

Dentro dos containers, as duas aplicações usam a porta `3000`, sem conflito. No host, ficam `3001:3000` (frontend) e `3000:3000` (backend).

Os `.dockerignore` excluem ao menos `.git`, `node_modules`, `.env*`, artefatos de build (`dist`, `.next`, `src/generated`) e testes e2e. Como o contexto de build é `backend/` ou `frontend/`, o `.env` da raiz nunca entra nas imagens.

## Risks / Trade-offs

- **Cookies `Secure`** → o login por HTTP em IP de rede tende a falhar. Mitigação: uso documentado via `localhost`.
- **Refresh em memória** → mais de uma réplica do frontend pode reenviar um refresh token e revogar sessões. Mitigação: uma única réplica, com o motivo documentado.
- **Seed restaura dados de teste a cada subida** → alterações nesses registros se perdem. Decisão do usuário. Mitigação: comportamento documentado.
- **`POSTGRES_PASSWORD` só vale na criação do volume** → trocar a senha depois quebra a autenticação. Mitigação: orientar `docker compose down -v` ou alterar a senha no banco.
- **`argon2` sem binário pré-compilado para a plataforma** → `npm ci` tentaria compilar, e a imagem slim não tem ferramentas de build. Mitigação: o login nos testes exercita o módulo. Se falhar, instalar `python3`, `make` e `g++` só nos estágios de instalação.
- **`next build` com `cacheComponents`** → pode tentar prerender que dependa da API. Não há `use cache` no código, e `API_BASE_URL` é lida sob demanda. Mitigação: o build é a verificação. Se depender da API, registrar um impeditivo antes de adotar um contorno.
- **`next start` com `standalone`** → pode deixar de ser o caminho indicado para rodar fora do Docker. Os e2e usam `next dev` e não são afetados. Mitigação: verificar e ajustar a orientação em `frontend/docs/frontend-guidelines.md`, se necessário.
- **Documentação do Next** → a consulta usou a v16.2.9, e o projeto usa a 16.4.0. Mitigação: ler `node_modules/next/dist/docs/` antes de escrever, conforme `frontend/AGENTS.md`.
- **Raiz sem versionamento** → `compose.yaml`, `.env.example` e esta change não têm histórico. Decisão do usuário.

## Migration Plan

Não há dados nem deploy existentes. A adoção é aditiva: quem roda fora do Docker continua igual, exceto por precisar liberar as portas `3000` e `3001` antes da subida. Para reverter, execute `docker compose down -v`, remova os arquivos novos e retire `output: "standalone"`.
