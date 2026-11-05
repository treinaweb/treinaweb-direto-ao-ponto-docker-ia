# Proposal

## Why

A lista (`add-ticket-list`) e a abertura (`add-ticket-create`) levam a `/chamados/{id}`, que ainda é uma página "Em breve". Sem o detalhe, ninguém consegue tocar o atendimento: o atendente não assume a fila, ninguém resolve nem fecha chamados e o cliente não reabre. Esta é a terceira de três changes sobre chamados. Os comentários ficam para a próxima spec.

## What Changes

- **Detalhe do chamado em `/chamados/{id}`:** título, status, prioridade, categoria, cliente, atendente ("Na fila" sem atendente), descrição completa e datas de abertura, última atualização e fechamento.
- **Só as ações que a API aceitaria**, conforme o papel, a relação do usuário com o chamado (dono, atendente atribuído ou não) e o status atual (`docs/api-reference.md`, "Atribuição" e "Transições de status"):
  - `CUSTOMER` dono: "Fechar chamado" (Aberto, Resolvido) e "Reabrir" (Resolvido).
  - `SUPPORT`: "Assumir" (Aberto, na fila). Quando é o atendente atribuído: "Aguardar cliente" e "Resolver" (Em andamento), e "Resolver" (Aguardando cliente).
  - `ADMIN`: "Atribuir" ou "Reatribuir" a um atendente (Aberto, Em andamento, Aguardando cliente), "Aguardar cliente" e "Resolver" (Em andamento), "Resolver" (Aguardando cliente) e "Fechar chamado" (Aberto, Resolvido).
  - Fechado: nenhuma ação.
- **Fechar pede confirmação**, porque é definitivo.
- **Resultado e erros:** depois de cada ação, o chamado é recarregado com uma mensagem de confirmação. 409 e 422 recarregam o chamado e explicam o que houve. 404 avisa que o chamado não está mais disponível. 403, 400, rede e 401 seguem as diretrizes.
- **Cliente aguardando resposta:** em "Aguardando cliente", o cliente vê o aviso de que o atendimento aguarda a resposta dele. Responder entra com os comentários.
- **Abrir chamado passa a levar ao detalhe:** depois de criar, o cliente vai para `/chamados/{id}` com o aviso "Chamado aberto.", e não mais para a lista.
- `/chamados/{id}` deixa de ser página "em construção". A regra de id inválido vira parte do detalhe.

## Capabilities

### New Capabilities

- `ticket-detail`: visualização completa de um chamado e execução das ações de atribuição e mudança de status permitidas ao papel e ao status, com confirmações, mensagens e tratamento de erros.

### Modified Capabilities

- `ticket-create`: o requisito "Confirmação após abrir" passa a levar ao detalhe do chamado criado.
- `app-shell`: o requisito "Páginas em construção" deixa de incluir `/chamados/{id}`. A regra do identificador inválido continua nele e é detalhada em `ticket-detail` ("Chamado não encontrado.").

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (Server Component para leitura, Server Actions com refresh reativo para mutações, autorização pelo DAL, mapeamento de 400/401/403/404/409/422, testes e responsividade) e `docs/api-reference.md`, seções "Tickets", "Visibilidade" (404 sem diferenciar inexistente de invisível), "Atribuição", "Transições de status" ("mostre só os botões válidos… mesmo assim, trate 422 e 409") e "Users" (`GET /users` para a lista de atendentes do ADMIN).
- **Endpoints da API:** `GET /tickets/{id}`, `GET /users/me`, `GET /users` (só ADMIN, para atribuir), `PATCH /tickets/{id}/assign` e `PATCH /tickets/{id}/status`.
- **Código:** `app/(app)/chamados/[id]/` ganha `page.tsx` real e `actions.ts`. Novos `getTicket`, `assignTicket` e `updateTicketStatus` em `lib/api/tickets.ts`, `getTicketActions` (regra pura de permissões) em `lib/tickets/`, lista de atendentes em `lib/api/users.ts` e componentes em `components/tickets/`. `CurrentUser` (`lib/auth/dal.ts`) passa a incluir o `id`, usado só no servidor. `createTicketAction` muda o destino. Componente shadcn `alert-dialog` para a confirmação de fechar.
- **Dependências:** depende de `add-ticket-list` e `add-ticket-create`. Arquivar por último.
- **Fora do escopo:** comentários e notas internas, que serão a próxima spec.
- **Testes:** Vitest para a matriz de permissões (todas as combinações de papel, relação e status), a Server Action e a lista de atendentes. Playwright contra a API real (desktop e mobile) percorrendo o ciclo de vida com chamados criados pelo teste.
