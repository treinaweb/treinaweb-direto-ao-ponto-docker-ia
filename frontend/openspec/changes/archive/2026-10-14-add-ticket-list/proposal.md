# Proposal

## Why

`/chamados` ainda é uma página "Em breve", mas o painel já leva até ela: os cartões de status abrem `/chamados?status=X` e o "Ver fila" do atendente abre `/chamados?status=OPEN`. Esta é a primeira de três changes sobre chamados: lista (esta), abrir chamado (`add-ticket-create`) e detalhe com ações (`add-ticket-detail`). A lista vem primeiro porque é o ponto de chegada das outras duas e de todos os links do painel.

## What Changes

- **Lista de chamados em `/chamados`** com os chamados que o papel pode ver, conforme `GET /tickets`: o cliente vê só os próprios, o atendente vê a fila e os atribuídos a ele, o administrador vê todos. A ordem é a da API (mais recentes primeiro).
- **Colunas por papel:** o cliente vê título, status, prioridade, categoria e data de abertura. A equipe vê também o cliente e o atendente ("Na fila" quando não há atendente). Cada linha leva a `/chamados/{id}`.
- **Filtros por status e prioridade**, combináveis, guardados na URL (`?status=&priority=&page=`), para que os links do painel, o botão voltar e o compartilhamento do endereço funcionem. Parâmetros inválidos são descartados sem erro.
- **Atalho "Fila" para o atendente**, equivalente a `status=OPEN`. Pela regra da API, um chamado atribuído sai de `OPEN`, então `OPEN` é exatamente a fila.
- **Paginação** de 20 por página, com "Anterior", "Próxima", "Página X de Y" e o total de chamados.
- **Estados vazios e de falha:** cliente sem chamados, filtro sem resultado, página além do total e falha ao carregar.
- **Responsivo:** linhas em grade no desktop e cards no mobile, sem scroll horizontal em 360px.
- **Sem busca e sem ordenação manual.** A API não oferece busca, filtro por categoria ou atendente, nem ordenação. Ordenar no navegador só reordenaria a página atual, o que seria enganoso. Para ver primeiro o que é urgente, o caminho é o filtro de prioridade.
- `/chamados` deixa de ser página "em construção".

## Capabilities

### New Capabilities

- `ticket-list`: listagem dos chamados visíveis ao usuário, com filtros por status e prioridade na URL, paginação, estados vazios e de falha, e layout responsivo.

### Modified Capabilities

- `app-shell`: o requisito "Páginas em construção" deixa de incluir `/chamados`.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (BFF server-first, validação zod de `searchParams`, mapeamento de erros, testes e responsividade, incluindo "tabelas/listas de tickets viram cards no mobile") e `docs/api-reference.md`, seções "Tickets", "Visibilidade", "Paginação" (máx. 50 em `GET /tickets`) e "Erros". Visual conforme `components/ui/references/design-system.md` (painel `cloud`, chips de status e prioridade com texto e cor).
- **Endpoints da API (só leitura):** `GET /tickets` (`page`, `limit`, `status`, `priority`) e `GET /users/me`.
- **Código:** `app/(app)/chamados/page.tsx` deixa de usar `ComingSoon`. Novos componentes em `components/tickets/` (lista, filtros, paginação, estados vazios), schema zod de `searchParams` em `lib/validation/` e helpers puros em `lib/tickets/`. Reaproveita `listTickets`, `StatusChip`/`PriorityChip`, `STATUS_LABELS`/`PRIORITY_LABELS`, `formatDate`/`formatNumber` e `loadPanel`.
- **Ordem com as próximas changes:** `add-ticket-create` e `add-ticket-detail` também alteram "Páginas em construção" e partem do estado deixado por esta. Arquivar na ordem: `add-ticket-list` → `add-ticket-create` → `add-ticket-detail`.
- **Testes:** Vitest para o schema dos filtros e os helpers de URL e paginação. Playwright contra a API real (desktop e mobile) com chamados criados pelo próprio teste, usando prefixo único.
