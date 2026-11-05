# Proposal

## Why

O ambiente em containers atual roda imagens de produção, então cada alteração de código exige reconstruir a imagem para aparecer. Um ambiente de desenvolvimento em Docker permite editar o código no host e ver o resultado com a aplicação rodando, sem instalar PostgreSQL nem depender de Node.js no host para executá-la.

## What Changes

- Novo `compose.dev.yaml` na raiz, combinado com o `compose.yaml` por `docker compose -f compose.yaml -f compose.dev.yaml`, em um projeto Compose próprio.
- Frontend em `next dev` e backend em `nest start --watch`, com o código de `frontend/` e `backend/` compartilhado com os containers.
- `node_modules` em volumes do Docker, com reinstalação automática ao iniciar o serviço quando o `package-lock.json` mudar.
- Novo estágio `dev` em `backend/Dockerfile` e `frontend/Dockerfile`. O estágio `runtime` continua sendo o padrão.
- Banco de desenvolvimento separado, com migrations e seed a cada subida e publicado somente em `127.0.0.1:5432`.
- `README.md` da raiz atualizado com comandos de desenvolvimento, fluxo do Prisma e preparo do editor.
- `init: true` em desenvolvimento e, se o teste mostrar que resolve o encerramento forçado do backend, também no `compose.yaml`. Essa alteração não muda nenhum requisito de produção.

`docker compose up --build`, sem `-f`, continua subindo o ambiente de produção. Por isso, o arquivo não se chama `compose.override.yaml`, que o Compose leria automaticamente.

**Fora de escopo**: rodar os ambientes de produção e de desenvolvimento ao mesmo tempo (usam as mesmas portas), suporte a macOS e Windows, depurador remoto, testes unitários e e2e em containers, atualização do Next.js e limitação das portas `3000` e `3001` a `127.0.0.1`.

## Capabilities

### New Capabilities

- `container-dev-environment`: execução do TreinaDesk em containers para desenvolvimento, com alterações de código refletidas na aplicação em execução, banco isolado e arquivos gerados disponíveis no host.

### Modified Capabilities

Nenhuma. `container-runtime` continua descrevendo apenas o ambiente de produção, inclusive a proibição de publicar a porta do PostgreSQL.

## Impact

- **`docker-ia/` (sem versionamento git)**: novo `compose.dev.yaml`; `README.md` atualizado; `compose.yaml` só recebe `init: true`, se aprovado no teste.
- **`backend/` e `frontend/` (repositórios próprios)**: novo estágio `dev` nos Dockerfiles, sem alteração no código das aplicações. `frontend/next.config.ts` só muda se o HMR exigir `allowedDevOrigins`.
- **Docker na máquina**: novo projeto `treinadesk-docker-ia-dev`, com imagens próprias e volumes para banco e `node_modules`.
- **Portas no host**: `3000`, `3001` e `127.0.0.1:5432`. As duas primeiras continuam em todas as interfaces, como na produção; com a vulnerabilidade conhecida do Next 16.4.0, esse servidor de desenvolvimento fica alcançável pela rede local.
- **Arquivos no host**: `dist/`, `.next/` e `src/generated/` passam a ser gravados nas pastas do projeto; todos já estão ignorados pelo git. As pastas `node_modules` são criadas nelas como pontos de montagem.
- **Editor**: autocomplete e tipos exigem um `npm install` separado no host, que o container não usa.
