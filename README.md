# TreinaDesk em containers

Sobe o PostgreSQL, a API (`backend/`) e o frontend (`frontend/`) com um único comando. O ambiente é para **uso local**: os usuários de teste têm senha pública, então não o exponha na rede.

Há dois modos: **produção**, descrito a seguir, com imagens prontas, e [**desenvolvimento**](#ambiente-de-desenvolvimento), que reflete as alterações de código com a aplicação rodando.

## Pré-requisitos

- Docker com Docker Compose.
- `backend/` e `frontend/` clonados nesta pasta.
- Portas `3000` e `3001` livres no host.

## Como usar

```bash
cp .env.example .env    # preencha os três segredos, conforme as instruções do arquivo
docker compose up --build
```

Quando `frontend` ficar `healthy`, acesse:

| O quê | Endereço |
|---|---|
| Aplicação | http://localhost:3001 |
| Swagger da API | http://localhost:3000/docs |
| Contrato OpenAPI | http://localhost:3000/docs-json |

## Usuários de teste

A senha é `senhaSegura123`. O ADMIN do `.env` também fica disponível, com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

| E-mail | Papel |
|---|---|
| `ana@teste.com` | CUSTOMER |
| `bia@teste.com` | SUPPORT |
| `diego@teste.com` | ADMIN |

## Comandos

| Comando | O que faz |
|---|---|
| `docker compose up --build` | Reconstrói as imagens e sobe tudo |
| `docker compose down` | Remove os containers e mantém os dados |
| `docker compose down -v` | Remove os containers **e apaga o banco** |
| `docker compose run --rm migrate` | Reaplica migrations e seed sem reiniciar o restante |
| `docker compose ps` | Mostra o estado dos serviços |

## Limitações

- **Só `localhost`**: em produção, os cookies de sessão são `Secure`, então o login por HTTP em IP de rede tende a falhar.
- **Uma réplica do frontend**: o refresh de sessão fica em memória de processo, e réplicas podem revogar sessões. Não use `--scale frontend=2`.
- **O seed roda a cada subida**: usuários, categorias, tickets e comentários de teste voltam ao estado original. O que você criar é mantido.
- **`POSTGRES_PASSWORD` só vale na criação do volume**: para trocá-la, altere-a no banco ou recrie o volume com `docker compose down -v`, o que apaga os dados.
- **Conflito de portas**: pare a API e o frontend que estejam rodando fora do Docker antes de subir.

## Ambiente de desenvolvimento

Roda `next dev` e `nest start --watch` com o código das pastas `frontend/` e `backend/`. Salve um arquivo no editor e a aplicação em execução é atualizada, sem rebuild. Requer host Linux com UID 1000.

### Primeira subida

Crie as pastas `node_modules` antes de subir. Sem isso, o Docker as cria como `root`, e o `npm install` no host falha por permissão.

```bash
mkdir -p backend/node_modules frontend/node_modules
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Se `backend/node_modules` já tiver sido criada como `root`, pare o ambiente e rode `rmdir backend/node_modules` antes do `mkdir`.

Os endereços e usuários de teste são os mesmos da produção. O PostgreSQL também fica disponível no host, em `127.0.0.1:5432`, com as credenciais do `.env`.

### O que esperar ao salvar

| Alteração | Resultado |
|---|---|
| Frontend | Atualiza no navegador, sem recarregar a página |
| `backend/src/` | Recompila e reinicia a API em poucos segundos; chamadas nesse intervalo podem falhar |
| Código do backend com erro de compilação | O erro aparece nos logs, e a versão anterior continua no ar até a correção |

### Comandos

Para encurtar os comandos, defina a variável no seu shell. **Não a coloque no `.env`**, pois isso faria o `docker compose up` sem `-f` subir o ambiente de desenvolvimento.

```bash
export COMPOSE_FILE=compose.yaml:compose.dev.yaml
```

Os exemplos abaixo assumem essa variável. Para voltar à produção no mesmo shell, rode `unset COMPOSE_FILE`.

| Comando | O que faz |
|---|---|
| `docker compose up --build` | Sobe o ambiente de desenvolvimento |
| `docker compose logs -f backend frontend` | Acompanha os logs |
| `docker compose restart backend` | Reinicia a API e instala dependências, se o lock tiver mudado |
| `docker compose down` | Para tudo e mantém os dados |
| `docker compose down -v` | Apaga o banco e os `node_modules` de **desenvolvimento**; a produção não é afetada |

### Trocar de ambiente

Os dois usam as portas `3000` e `3001`, então rode `docker compose down` no ambiente atual antes de subir o outro. Cada um tem seu próprio banco, então a sessão aberta no navegador não vale no outro ambiente: o aviso de sessão expirada é esperado, basta entrar de novo.

### Prisma

Rode os comandos dentro do container. As migrations criadas aparecem em `backend/prisma/migrations`, no host.

```bash
docker compose exec backend npx prisma migrate dev --name <nome> --config prisma7.config.ts
docker compose exec backend npx prisma generate --config prisma7.config.ts
```

Migrations novas também são aplicadas a cada `docker compose up`.

### Dependências e editor

Os containers usam `node_modules` em volumes do Docker, separados dos do host. Para ter autocomplete e tipos no editor, instale também no host:

```bash
(cd backend && npm install)
(cd frontend && npm install)
```

Depois de mudar o `package-lock.json`, reinicie o serviço com `docker compose restart <serviço>`: ele detecta a diferença e roda `npm ci` no volume.

### Cuidados

- **`.env` locais**: `backend/.env` e `frontend/.env.local` ficam visíveis no container. Os valores definidos no compose têm prioridade, mas as demais variáveis desses arquivos passam a valer.
- **`npm run test:e2e` no host**: os testes do backend apagam as tabelas do banco de `DATABASE_URL`. Se ele apontar para `127.0.0.1:5432`, os dados de desenvolvimento são apagados; o seed só restaura os de teste.
- **`next dev` no host**: usa a mesma pasta `.next`. Não o rode com o ambiente em execução.
- **Next.js 16.4.0**: o `npm audit` aponta vulnerabilidade crítica nessa versão, corrigida na 16.4.5. As portas `3000` e `3001` ficam abertas na rede local, então não use este ambiente em redes não confiáveis antes de atualizar.
