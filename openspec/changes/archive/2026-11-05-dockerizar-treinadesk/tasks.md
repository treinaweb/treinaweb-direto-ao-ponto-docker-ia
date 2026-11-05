# Tasks

Durante a implementação, escreva logo abaixo de cada task uma linha `> Implementação:` ou `> Impeditivo:`, conforme `frontend/docs/frontend-guidelines.md`, seção 7.

## 1. Imagens do backend

- [x] 1.1 Criar `backend/.dockerignore` (D10) e verificar, em um build de teste, que `.env`, `node_modules` e `.git` não entram no contexto
  > Implementação: `backend/.dockerignore` criado; um build de sonda com `.env` e `node_modules` temporários listou o contexto sem esses itens e sem `.git`.
- [x] 1.2 Criar `backend/Dockerfile` com os estágios até `build` (D1, D3, D4) e verificar que `docker build --target build ./backend` gera `dist/main.js` e `dist/generated/prisma`, sem banco acessível
  > Implementação: estágios `base`, `deps` e `build`; o build gerou os dois caminhos. Sem `DATABASE_URL`, o `prisma generate` falha com `PrismaConfigEnvError`, o que confirma a URL fictícia do D4.
- [x] 1.3 Adicionar o target `migrate` (D1) e verificar que `prisma` e `tsx` respondem dentro da imagem
  > Implementação: target `migrate` com usuário `node`; `tsx --version` respondeu e o `prisma` executou migrations e seed em um Postgres temporário. O aviso de libssl do Prisma aparece, mas não impediu a execução, então o `openssl` não foi instalado.
- [x] 1.4 Adicionar o target final `runtime` com usuário `node` (D1, D6) e verificar que `prisma` e `tsx` não estão instalados, que o usuário não é `root` e que nenhum `.env` está na imagem
  > Implementação: target `runtime` (358 MB). Só `--omit=dev` mantinha o `prisma`, peer opcional de `@prisma/client`, por isso usa também `--omit=optional`. Verificados usuário `node`, ausência de `prisma`, `tsx` e `.env`, e `POST /auth/login` com 200 contra o Postgres temporário.

## 2. Imagem do frontend

- [x] 2.1 Ler o guia de `output` e de self-hosting em `frontend/node_modules/next/dist/docs/` (após `npm ci`) e registrar qualquer diferença em relação ao D5
  > Implementação: lidos `output.md` e `self-hosting.md` da versão 16.4.0; sem diferença em relação ao D5. A seção de múltiplos servidores não se aplica, pois há uma réplica.
- [x] 2.2 Adicionar `output: "standalone"` a `frontend/next.config.ts` e verificar que os testes do frontend (`npm test`) continuam passando
  > Implementação: opção adicionada; `npm test` passou com 45 arquivos e 716 testes.
- [x] 2.3 Verificar o efeito do `standalone` em `next start` e, se a orientação mudar, ajustar `frontend/docs/frontend-guidelines.md`
  > Implementação: o `next start` ainda respondeu 200 em `/login`, mas avisa que não funciona com `standalone` e indica `node .next/standalone/server.js`. A seção de E2E das diretrizes foi ajustada. O script `npm start` não foi alterado, e os e2e usam `next dev`.
- [x] 2.4 Criar `frontend/.dockerignore` (D10) e `frontend/Dockerfile` multi-stage com usuário `node`, `HOSTNAME=0.0.0.0` e `PORT=3000` (D5, D6) e verificar que `docker build ./frontend` conclui sem a API no ar e sem `API_BASE_URL`
  > Implementação: arquivos criados; o build concluiu sem API e sem a variável, com rotas estáticas e de prerender parcial.
- [x] 2.5 Verificar que a imagem do frontend não contém `.env*`, que o usuário não é `root` e que `public/` e `.next/static/` estão presentes
  > Implementação: imagem de 271 MB com usuário `node`, nenhum `.env*` e os dois diretórios presentes.

## 3. Orquestração

- [x] 3.1 Criar `.env.example` na raiz com as variáveis do D9 e os comandos `openssl rand -hex` e verificar que não contém segredos reais
  > Implementação: arquivo criado com os três segredos vazios e os opcionais comentados.
- [x] 3.2 Criar `compose.yaml` na raiz com `postgres`, `migrate`, `backend` e `frontend`, dependências, healthchecks, volume e portas (D2, D7, D8, D9, D10) e verificar com `docker compose config`, usando um `.env` copiado do exemplo
  > Implementação: `compose.yaml` criado com `name: treinadesk-docker-ia`, porque `treinadesk` já pertence a outro projeto da máquina. O `config` passou com um `.env` feito a partir do exemplo e com os segredos gerados.
- [x] 3.3 Verificar o cenário "Segredo ausente": sem cada um dos três segredos obrigatórios, `docker compose up` falha antes de criar containers e cita a variável
  > Implementação: para cada segredo vazio, o `up` saiu com código 1 citando a variável, e nenhum container foi criado.
- [x] 3.4 Criar `README.md` na raiz com pré-requisitos, comandos (`up --build`, `down`, `down -v`, `run --rm migrate`), URLs, usuários de teste e limitações (só `localhost`, réplica única, restauração do seed, senha do Postgres), e verificar que os comandos documentados funcionam
  > Implementação: `README.md` criado; `up --build`, `down`, `down -v`, `ps` e `run --rm migrate` foram executados com sucesso.

## 4. Verificação integrada

Requer `.env` real e as portas `3000` e `3001` livres. Comece com `docker compose down -v`, que apaga apenas o volume deste projeto.

- [x] 4.1 Verificar os cenários "Primeira subida em banco vazio", "Serviços aguardam o banco" e "Dados disponíveis no banco novo": `docker compose up --build` conclui com os serviços `healthy` e os logs mostram a ordem correta
  > Implementação: com volume novo, os horários de início mostraram a ordem postgres, migrate, backend e frontend. `/login` respondeu 200 e o seed gravou o ADMIN, 6 usuários, 4 categorias, 6 tickets e 4 comentários.
- [x] 4.2 Verificar "Login pelo navegador usando a API em container" e "Comunicação entre containers": login em `http://localhost:3001`, sessão mantida ao recarregar e nenhuma requisição do navegador à porta `3000`
  > Implementação: login com `ana@teste.com` no Chrome abriu o painel, e a sessão se manteve em novas navegações para `/chamados` e `/dashboard`. Nenhuma requisição à porta `3000` foi registrada depois de ativar o rastreamento de rede.
- [x] 4.3 Verificar "Swagger disponível", "Banco inacessível pelo host" e "Usuário de execução" com `curl`, `docker compose ps` e `docker compose top`
  > Implementação: `/docs-json` respondeu 200; o Postgres mostra só `5432/tcp`, sem publicação no host; `id -un` retornou `node` nos dois serviços.
- [x] 4.4 Verificar "Dados preservados entre subidas", "Dados de teste restaurados" e "Migrations já aplicadas": criar um ticket e alterar um usuário de teste, executar `down` e `up` e conferir o resultado
  > Implementação: o ticket criado pela API sobreviveu a `down` e `up`. `bia@teste.com`, alterada no banco para ADMIN com hash inválido, voltou a SUPPORT e entrou com a senha do seed. O log mostrou "No pending migrations to apply".
- [x] 4.5 Verificar "Remoção explícita do volume": após `down -v` e `up`, o ticket criado não existe e os dados de teste sim
  > Implementação: após `down -v` e `up`, o ticket criado não existia e os 6 tickets de teste sim. O volume `treinadesk_db-data`, do outro projeto, continuou intacto.
- [x] 4.6 Verificar "Falha no preparo do banco": com uma falha provocada temporariamente (por exemplo, `run` com `DATABASE_URL` inválida ou um override), o `up` termina com código diferente de zero sem iniciar API e frontend, e depois desfazer a alteração
  > Implementação: com um override temporário que fazia o `migrate` sair com código 3, o `up` saiu com código 1, informou a falha e deixou `backend` e `frontend` em `created`, sem iniciar. O override foi removido.
- [x] 4.7 Verificar "Troca de endereço sem rebuild": criar um container da imagem do frontend com outro `API_BASE_URL` e confirmar nos logs ou na resposta que o novo endereço é usado
  > Implementação: com a mesma imagem e `API_BASE_URL` apontando para uma API falsa, a API falsa registrou `POST /auth/refresh` e o frontend redirecionou para o login.
- [x] 4.8 Verificar "Segredos locais fora da imagem": com `backend/.env` e `frontend/.env.local` presentes, reconstruir e confirmar que eles não estão nas imagens
  > Implementação: com arquivos-sonda temporários, o build `--no-cache` gerou imagens sem `.env` em `/app` e sem o conteúdo da sonda fora de `node_modules`. As sondas foram removidas.
- [x] 4.9 Executar `openspec validate dockerizar-treinadesk --strict` e confirmar, com `git status` em `backend/` e `frontend/`, que só mudaram os arquivos previstos e que nenhum `.env` foi adicionado
  > Implementação: validação estrita aprovada. `backend/` tem só `.dockerignore` e `Dockerfile` novos; `frontend/` tem esses dois, mais `next.config.ts` e `docs/frontend-guidelines.md`. Nenhum `.env` aparece no `git status`.
