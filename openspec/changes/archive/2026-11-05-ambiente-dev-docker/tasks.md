# Tasks

Durante a implementação, escreva logo abaixo de cada task uma linha `> Implementação:` ou `> Impeditivo:`, conforme `frontend/docs/frontend-guidelines.md`, seção 7.

Regras para todas as verificações:

- Não executar `down -v` sem antes confirmar que o projeto resolvido é `treinadesk-docker-ia-dev`. Os volumes `treinadesk_db-data` e `treinadesk-docker-ia_postgres-data` não podem ser alterados.
- Sondas temporárias em arquivos existentes devem ser desfeitas a partir de uma cópia, não com `git checkout`, para preservar alterações que o usuário ainda não commitou. Não usar `frontend/app/(auth)/login/page.tsx`, que tem alteração do usuário.

## 1. Imagens de desenvolvimento

- [x] 1.1 Adicionar o estágio `dev` a `backend/Dockerfile` (D5) e verificar que `docker build --target dev ./backend` conclui, com usuário `node` dono de `/app/node_modules` e marcador presente
  > Implementação: Estágio `dev` após `deps` no `backend/Dockerfile`; build concluído, com `node` como dono de `/app/node_modules` e `.dev-package-lock` igual ao lock.
- [x] 1.2 Adicionar o estágio `dev` a `frontend/Dockerfile` (D5) e verificar o mesmo com `docker build --target dev ./frontend`
  > Implementação: Mesmo estágio no `frontend/Dockerfile`, com a mesma verificação.
- [x] 1.3 Verificar que `docker build ./backend` e `docker build ./frontend`, sem `--target`, continuam gerando o estágio `runtime`, com `node dist/main.js` e `node server.js` como comandos
  > Implementação: Builds sem `--target` mantêm `[node dist/main.js]` e `[node server.js]`, com usuário `node`.

## 2. Orquestração de desenvolvimento

- [x] 2.1 Criar `compose.dev.yaml` (D1, D2, D3, D4, D6, D7, D8, D9, D10) e verificar com `docker compose -f compose.yaml -f compose.dev.yaml config` que o nome do projeto é `treinadesk-docker-ia-dev`, os targets são `dev` e a porta do banco está em `127.0.0.1`, e que `docker compose config` sem `-f` continua igual ao de produção
  > Implementação: `compose.dev.yaml` criado; `config` mostra projeto `treinadesk-docker-ia-dev`, targets `dev`, volumes próprios e `host_ip: 127.0.0.1`. Sem `-f`, o projeto continua `treinadesk-docker-ia`, com targets `runtime` e `migrate`.
- [x] 2.2 Verificar "Primeira subida": com o projeto de dev confirmado, subir com `up --build` a partir de volumes vazios e confirmar serviços `healthy`, `/login` e `/docs-json` respondendo, e `backend/src/generated/prisma` no host
  > Implementação: Subida a partir de volumes novos em 68 s, com serviços `healthy`, `/login` e `/docs-json` em 200 e `backend/src/generated/prisma` no host.
- [x] 2.3 Verificar "Segredo ausente": com um arquivo temporário sem `JWT_ACCESS_SECRET`, o comando falha antes de criar containers e cita a variável
  > Implementação: Com `.env` temporário sem a variável, o `up` saiu com código 1 citando `JWT_ACCESS_SECRET`, sem criar nem alterar containers.
- [x] 2.4 Verificar "Publicação restrita" e "Conexão pelo host": `docker compose ps` mostra `127.0.0.1:5432` e uma conexão pelo host é aceita
  > Implementação: `docker compose ps` mostra `127.0.0.1:5432->5432/tcp`, `ss` confirma só loopback, e `psql` pelo host leu o banco `treinadesk`.
- [x] 2.5 Verificar o ponto de montagem de `node_modules` em `backend/` e "Instalação no host": conferir o dono da pasta criada e executar `npm install` no host com o ambiente em execução. Se houver erro de permissão, aplicar a mitigação do design e confirmar que o `npm install` conclui e não altera o volume do container
  > Implementação: Sem preparo, o Docker criou `backend/node_modules` como `root`. Mitigação: `mkdir -p backend/node_modules frontend/node_modules` antes da primeira subida; com ambiente parado, a pasta vazia pode ser removida e recriada sem `sudo`. Com isso, `npm install` no host concluiu com o ambiente em execução, sem mudar o lock nem o volume.
- [x] 2.6 Medir a parada de `backend` e `frontend` com e sem `init: true` (D10) e registrar o resultado
  > Implementação: Em dev, a parada foi imediata com e sem `init: true` (código 143 com, 1 sem), pois o processo principal é o `npm`. A comparação não reproduz o `137` da produção, então a decisão fica para a task 5.2. `init: true` foi mantido em dev.

## 3. Comportamento em execução

- [x] 3.1 Verificar "Login em desenvolvimento" no navegador: login com `ana@teste.com` abre o painel e os cookies de sessão não têm `Secure`
  > Implementação: Login no Chrome com `ana@teste.com` abriu o painel ("Olá, Ana"). Os `Set-Cookie` de `td_access` e `td_refresh` não têm `Secure` em dev e têm na produção.
- [x] 3.2 Verificar "Página aberta no navegador" e "Arquivo novo" com uma página de sonda temporária em `frontend/app/`: a rota nova responde, e uma edição aparece sem recarga manual nem recriação do container. Se o HMR for bloqueado, usar `allowedDevOrigins` (ver riscos). Remover a sonda e confirmar a remoção no `git status`
  > Implementação: Página de sonda respondeu 200 sem reiniciar. Com ela aberta, a edição virou `SONDA-V2` no navegador, e um marcador em `window` sobreviveu, confirmando que não houve recarga. Não foi preciso `allowedDevOrigins`. A sonda foi removida.
- [x] 3.3 Verificar "Alteração em uma rota": alterar temporariamente `backend/src/app.service.ts`, confirmar a nova resposta de `GET /` com token e que o id do container não mudou; desfazer a partir da cópia e confirmar a volta da resposta original
  > Implementação: O primeiro teste falhou: o processo antigo seguia servindo e o novo morria com `EADDRINUSE`, porque o `nest --watch` usa `ps`, ausente na imagem. Corrigido instalando `procps` no estágio `dev` do backend (registrado no D5). Agora a resposta muda em cerca de 1 s, com escrita direta e com rename atômico, no mesmo container. Arquivo restaurado da cópia, sem diff.
- [x] 3.4 Verificar "Erro de compilação": salvar temporariamente um erro de tipo em `backend/src/app.service.ts`, conferir o erro nos logs e o container em execução; desfazer e confirmar que a API volta a responder
  > Implementação: Com erro de tipo, o log mostrou `TS2322`, o container seguiu em execução e a versão anterior continuou respondendo; ao corrigir, a API voltou à resposta original em cerca de 1 s.
- [x] 3.5 Verificar que `git status` em `frontend/` e `backend/` não mostra alteração em `AGENTS.md` nem nenhum arquivo não previsto
  > Implementação: `AGENTS.md` sem alteração; o `git status` só mostra arquivos previstos e `frontend/app/(auth)/login/page.tsx`, que já estava modificado antes desta change.

## 4. Banco, Prisma e dependências

- [x] 4.1 Verificar "Migration criada no container": com uma alteração temporária no schema, executar `prisma migrate dev --create-only` no `backend` e conferir a migration no host, com o usuário do host como dono. Manter a migration para a task 4.2
  > Implementação: Com modelo temporário no schema, `prisma migrate dev --create-only` no `backend` criou a migration no host, com o usuário do host como dono. Executado com TTY, pois o comando é interativo.
- [x] 4.2 Verificar "Migration nova no host": substituir o conteúdo da migration de sonda por um SQL inofensivo, subir de novo sem `--build` e confirmar que ela foi aplicada. Remover a migration e a alteração do schema e recriar o volume do banco de dev com `down -v` no projeto confirmado
  > Implementação: A migration de sonda (cria a tabela `sonda_dev`) foi aplicada em uma subida sem `--build`, e a tabela existia. Migration e schema foram restaurados, e o `down -v` no projeto confirmado recriou o banco de dev com 5 migrations e 6 tickets.
- [x] 4.3 Verificar "Falha no preparo" com um override temporário do `migrate`: o `up` falha, informa o erro e não inicia API e frontend
  > Implementação: Com override temporário em que o `migrate` sai com código 3, o `up` saiu com código 1 e informou a falha, e `backend` e `frontend` ficaram em `created`. Override removido.
- [x] 4.4 Verificar "Dependência nova" e "Sem alteração de dependências" em uma cópia temporária do `package-lock.json`, ou por meio de uma alteração reversível do marcador no volume: `npm ci` só roda quando há diferença e funciona com `node_modules` sendo ponto de montagem. Confirmar que o `package-lock.json` do repositório não mudou
  > Implementação: Restart sem diferença: nenhuma instalação, API de volta em 5 s. Com o marcador alterado no volume: `added 765 packages`, sem `EBUSY`, API de volta em 17 s e marcador atualizado. O `package-lock.json` não mudou.

## 5. Documentação e integração

- [x] 5.1 Atualizar `README.md` da raiz com comando de dev, `COMPOSE_FILE`, troca de ambientes, fluxo do Prisma, preparo do editor, troca de dependências e riscos do design (`.env` locais, restart do backend, `test:e2e`, Next 16.4.0), e verificar que os comandos documentados funcionam
  > Implementação: `README.md` atualizado. Executados como documentados com `COMPOSE_FILE`: `mkdir`, `up --build`, `logs`, `restart backend`, `prisma generate`, `prisma migrate dev --name` e `down`.
- [x] 5.2 Se a task 2.6 mostrar ganho, adicionar `init: true` ao `backend` do `compose.yaml` e verificar que o código de saída deixa de ser `137`. Caso contrário, registrar o motivo de não alterar
  > Implementação: Sem `init`, a produção levou 10 s para parar, com código 137. Com `init: true` no `backend` do `compose.yaml`, parou na hora, com código 143.
- [x] 5.3 Verificar "Dados separados" e "Remoção do volume de desenvolvimento": criar um ticket em dev, descer, subir produção com `docker compose up --build` e confirmar que ele não existe; depois, executar `down -v` no projeto de dev e confirmar que os volumes de produção e do outro projeto continuam existindo
  > Implementação: Ticket criado em dev não existe em produção. Com a produção no ar, `down -v` em dev removeu só os três volumes de dev; `treinadesk-docker-ia_postgres-data` e `treinadesk_db-data` continuam.
- [x] 5.4 Verificar "Subida padrão": em produção, `docker compose ps` mostra `healthy`, o login funciona no navegador, a API executa `node dist/main.js`, o frontend executa `node server.js`, e a imagem da API não tem `prisma` nem `tsx`. Descer ao final, sem `-v`
  > Implementação: Em produção: serviços `healthy`, login no Chrome abriu o painel, processos `node dist/main.js` e `node server.js`, usuário `node`, sem `prisma` e `tsx` na imagem da API. Descida sem `-v`.
- [x] 5.5 Executar `openspec validate ambiente-dev-docker --strict`, executar os testes do frontend se `next.config.ts` tiver mudado, e confirmar com `git status` que só mudaram os arquivos previstos e nenhum `.env` foi adicionado
  > Implementação: validação estrita aprovada. `next.config.ts` não mudou nesta change, então os testes do frontend não foram reexecutados. Em `backend/` e `frontend/` só mudaram os Dockerfiles (ambos ainda não commitados); o restante do `git status` vem da change anterior ou é a alteração do usuário em `login/page.tsx`. Nenhum `.env` foi adicionado.
