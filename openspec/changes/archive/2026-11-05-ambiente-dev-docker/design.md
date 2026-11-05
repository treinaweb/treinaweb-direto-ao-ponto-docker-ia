# Design

## Context

Motivação em `proposal.md`; comportamento exigido em `specs/container-dev-environment/spec.md`.

O `compose.yaml` da raiz define `postgres`, `migrate`, `backend` e `frontend` em modo de produção. Fatos que moldam o design:

- **Host**: Linux com UID 1000, igual ao do usuário `node` da imagem. A raiz não é versionada, e o projeto só roda nesta máquina.
- **Dockerfiles**: os estágios `deps` já têm todas as dependências, mas como `root`. O `runtime` é o último estágio.
- **Backend**: `npm run start:dev` executa `nest start --watch`; `deleteOutDir: true` apaga o `dist/` a cada build. O `src/generated` não existe no host.
- **Frontend**: `npm run dev` executa `next dev`; os cookies só são `Secure` com `NODE_ENV=production`.
- **Documentação do Next**: a origem padrão aceita pelo servidor de desenvolvimento é `localhost`; outras exigem `allowedDevOrigins`. O uso de polling é desaconselhado.
- **Outros projetos**: `treinadesk` (de `treinaweb/ref/docker-ia`) e `treinadesk-docker-ia` (produção) têm volumes que esta change não pode alterar.

## Goals / Non-Goals

**Goals:**

- Manter toda a configuração de desenvolvimento em um arquivo adicional, sem mudar o que `docker compose up --build` faz.
- Fazer com que arquivos gerados no container (migrations, client do Prisma) cheguem ao host.
- Detectar dependências defasadas sozinho, sem exigir rebuild ou remoção de volume.

**Non-Goals:**

- Portabilidade para macOS e Windows ou para outros UIDs.
- Tempo de resposta instantâneo no backend, que precisa recompilar e reiniciar.

## Decisions

### D1. `compose.dev.yaml` combinado por `-f`

O arquivo sobrepõe `name`, `build.target`, `command`, `volumes`, `environment` e `healthcheck` dos serviços existentes.

*Alternativas rejeitadas*:
- **`compose.override.yaml`**: o Compose o lê automaticamente, e `docker compose up --build` deixaria de subir produção.
- **Profiles**: exigiriam serviços duplicados com nomes diferentes, quebrando o nome `backend` usado em `API_BASE_URL` e nas dependências.

O `README` explica como encurtar o comando com `COMPOSE_FILE` no shell e alerta para não colocar essa variável no `.env`, pois isso mudaria o padrão.

### D2. Projeto próprio `treinadesk-docker-ia-dev`

`name` no `compose.dev.yaml` separa containers, imagens, rede e volumes. O `.env` da raiz é compartilhado. O nome de um arquivo posterior deve sobrepor o do anterior, e a primeira verificação confirma isso antes de qualquer `down -v`.

### D3. Bind mount do código, sem Compose Watch

`./backend:/app` e `./frontend:/app`, usados também pelo `migrate`. O Compose Watch copia arquivos só do host para o container, então uma migration criada com `prisma migrate dev` não chegaria ao repositório. No Linux, os watchers recebem os eventos do bind mount sem polling.

### D4. `node_modules` em volumes nomeados

Volumes `backend-node-modules` e `frontend-node-modules` montados em `/app/node_modules`; `migrate` e `backend` compartilham o primeiro. `dist/`, `.next/` e `src/generated/` ficam no bind mount: estão ignorados pelo git, `deleteOutDir` tende a falhar em ponto de montagem, e o editor precisa ver o client gerado.

*Alternativa rejeitada pelo usuário*: `node_modules` na pasta do projeto, mais simples, mas menos portável.

### D5. Estágio `dev` nos Dockerfiles

```
deps --> dev [novo]: copia o lock para o marcador, chown para node, USER node
deps --> build --> ...
... --> runtime [continua sendo o ultimo estagio]
```

O dono precisa ser `node` porque um volume novo herda o dono e o conteúdo do diretório da imagem. O marcador da instalação (D6) nasce na imagem. Sem `NODE_ENV=production` no estágio, os cookies ficam sem `Secure`.

O estágio `dev` do backend instala `procps`: o `nest start --watch` usa `ps` para encerrar o processo anterior e, na imagem `slim`, esse comando não existe. Sem ele, o processo antigo segue servindo, o novo morre com `EADDRINUSE` e o erro não interrompe o watcher.

### D6. Reinstalação só quando o lock muda

O `command` de cada serviço compara `package-lock.json` com o marcador `node_modules/.dev-package-lock`. Se diferirem, roda `npm ci` e atualiza o marcador; em seguida, inicia o processo. O `npm ci` deve remover o conteúdo sem apagar o ponto de montagem, o que é testado. `backend` e `frontend` têm volumes distintos, e `migrate` termina antes do `backend`, então não há instalação concorrente.

*Alternativa rejeitada*: `npm ci` a cada início, que deixaria toda subida lenta.

### D7. Sequência dos comandos

| Serviço | Sequência |
|---|---|
| `migrate` | Instala se necessário, `prisma generate`, `migrate deploy`, `db seed` |
| `backend` | Instala se necessário, `prisma generate`, `npm run start:dev` |
| `frontend` | Instala se necessário, `npm run dev` |

Todos os comandos do Prisma usam `--config prisma7.config.ts`. `migrate` e `backend` mantêm `NODE_ENV: development`, e o `backend` gera o client de novo porque pode ter reiniciado sem passar pelo `migrate`.

### D8. Healthchecks mais tolerantes

Mesmas verificações da produção (`/docs-json` e `/login`), com `start_period` maior, de ordem de minutos, porque uma subida pode incluir `npm ci`, compilação e a primeira renderização sob demanda do Next. Durante um restart do backend em execução, o status pode oscilar; os `retries` absorvem esse intervalo.

### D9. Porta do banco e portas das aplicações

`127.0.0.1:5432:5432` no `postgres`, adicionada só no arquivo de dev. As portas `3000` e `3001` vêm do `compose.yaml` sem alteração: limitá-las foi oferecido ao usuário, que não pediu.

### D10. `init: true`

Em `backend` e `frontend` no arquivo de dev. Na produção, o backend saiu com código `137`, provavelmente porque o Node, como PID 1, não trata `SIGTERM`. Se o teste mostrar parada rápida com `init: true`, o `backend` do `compose.yaml` recebe o mesmo ajuste, sem mudar nenhum requisito de produção.

### D11. Fluxo do Prisma documentado

Comandos executados dentro do `backend`: `prisma migrate dev --config prisma7.config.ts` seguido de `prisma generate --config prisma7.config.ts`. Ferramentas no host também podem usar `127.0.0.1:5432`.

## Risks / Trade-offs

- **Ponto de montagem criado como `root`** → com `backend/node_modules` ausente, o Docker tende a criar a pasta no host como `root`, e o `npm install` do editor falharia. Mitigação: testar e, se ocorrer, documentar `mkdir -p backend/node_modules frontend/node_modules` antes da primeira subida, ou corrigir o dono. Se a solução exigir algo além da documentação, pausar e relatar.
- **`next dev` e `allowedDevOrigins`** → o HMR pode ser bloqueado se a origem não for aceita. Mitigação: testar em `localhost:3001`. Só alterar `next.config.ts` se for necessário.
- **`.env` locais visíveis no container** → `backend/.env` e `frontend/.env.local` entram pelo bind mount. Os valores do compose têm prioridade, mas outras variáveis passariam a valer. Mitigação: documentar no `README`.
- **`AGENTS.md` versionado** → o `next dev` reescreve o arquivo quando detecta um agente. O container só recebe as variáveis declaradas, então não deve ocorrer. Mitigação: conferir com `git status` depois da subida.
- **API indisponível durante o restart** → chamadas do frontend podem falhar por alguns segundos depois de salvar. Comportamento esperado e documentado.
- **`npm run test:e2e` no host** → se apontar para `127.0.0.1:5432`, apaga os dados de desenvolvimento. Mitigação: alerta no `README`; o seed restaura os dados de teste.
- **Vulnerabilidade do Next 16.4.0** → o servidor de desenvolvimento fica na rede local pela porta `3001`. Mitigação: alerta no `README`. A atualização é tratada fora desta change.
- **`.next` compartilhado** → rodar `next dev` no host usa a mesma pasta. Não deve ser simultâneo com o container, o que a porta `3001` não impede. Mitigação: documentar.

## Migration Plan

A adoção é aditiva. Para trocar de ambiente, execute `down` no atual antes de subir o outro, porque as portas são as mesmas. Para reverter, execute `docker compose -f compose.yaml -f compose.dev.yaml down -v`, remova `compose.dev.yaml`, retire o estágio `dev` dos Dockerfiles, a seção do `README` e, se tiver sido adotado, o `init: true`.
