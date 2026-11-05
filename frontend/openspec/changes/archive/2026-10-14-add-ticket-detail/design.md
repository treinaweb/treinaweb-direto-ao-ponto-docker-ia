# Design

## Context

`/chamados/[id]` já valida o UUID (`parseTicketId`) e mostra `ComingSoon`. `getCurrentUser()` (`lib/auth/dal.ts`) devolve só `{ name, role }`. Para saber se o usuário é o dono ou o atendente atribuído, é preciso comparar ids, então o `id` precisa entrar no DTO. Mutações autenticadas usam `withSession` (refresh reativo, single-flight). A API valida tudo de novo e responde 422 para transição inválida, 409 para concorrência e 404 para chamado fora da visibilidade (`docs/api-reference.md`, "Atribuição" e "Transições de status"). `GET /users` é só do ADMIN, pagina até 100 por página e não filtra por papel.

## Goals / Non-Goals

**Goals:**
- Uma única regra pura decide quais ações aparecem, testável em todas as combinações e usada tanto na tela quanto nos testes.
- A API continua sendo a autoridade: a tela nunca oferece o que a API recusaria e mesmo assim trata 409, 422 e 404.
- Depois de qualquer ação, a página mostra o estado real do chamado, relido da API.

**Non-Goals:**
- Comentários, notas internas e a retomada automática por comentário do cliente: ficam para a próxima spec.
- Histórico de mudanças: a API não oferece.
- Atualização em tempo real (polling) quando outra pessoa altera o chamado.

## Decisions

### 1. `id` no `CurrentUser`, só no servidor

`CurrentUser` passa a `{ id, name, role }`. Os consumidores atuais (sidebar, top bar, dashboard, `/chamados`) só leem `name` e `role` em Server Components e não serializam o objeto para Client Components. O id é usado apenas no servidor para comparar com `ticket.customer.id` e `ticket.assignee?.id`. Os Client Components do detalhe recebem a lista de ações já calculada, nunca ids de usuário além do `assigneeId` das opções de atribuição.

### 2. Matriz de permissões em uma função pura

`getTicketActions(ticket, viewer)` em `lib/tickets/actions.ts` devolve a lista ordenada de ações disponíveis:

```
type TicketAction =
  | { kind: "assume" }                                   // SUPPORT, OPEN sem atendente
  | { kind: "assign"; mode: "assign" | "reassign" }      // ADMIN
  | { kind: "status"; to: "WAITING_CUSTOMER" | "RESOLVED" | "IN_PROGRESS" | "CLOSED" }

relacao:  dono = ticket.customer.id === viewer.id
          atribuido = ticket.assignee?.id === viewer.id

                 OPEN                 IN_PROGRESS            WAITING_CUSTOMER     RESOLVED                CLOSED
CUSTOMER dono    status:CLOSED        --                     -- (aviso)           status:IN_PROGRESS      --
                                                                                  status:CLOSED
SUPPORT          assume (sem atend.)  [atribuido]            [atribuido]          --                      --
                                      status:WAITING_CUST.   status:RESOLVED
                                      status:RESOLVED
ADMIN            assign|reassign      reassign               reassign             status:CLOSED           --
                 status:CLOSED        status:WAITING_CUST.   status:RESOLVED
                                      status:RESOLVED
```

`getCustomerNotice(ticket, viewer)` decide o aviso de "Aguardando cliente". Os rótulos ("Reabrir" para `RESOLVED → IN_PROGRESS`, "Fechar chamado", "Aguardar cliente", "Resolver", "Assumir", "Atribuir"/"Reatribuir") e as mensagens de sucesso ficam num mapa em `lib/tickets/action-labels.ts`.

Alternativa descartada: espalhar `if`s pelos componentes. Seria impossível testar a matriz inteira e fácil divergir da API.

### 3. Leitura no Server Component

```
/chamados/[id] (Server Component, dentro de <Suspense>)
  parseTicketId(id)              -> null: notFound()                (sem chamar a API)
  getCurrentUser()               -> { id, role }
  loadTicket(() => getTicket(token, id))
       404 / 400 -> notFound()   ("Chamado nao encontrado." em chamados/[id]/not-found.tsx)
       401       -> /login?aviso=sessao-expirada
       outro     -> <TicketLoadError/>   ("Nao foi possivel carregar o chamado.")
  actions = getTicketActions(ticket, user)
  <TicketHeader/> <TicketInfo/> <TicketDescription/> <TicketActions actions ticketId/>
      se ADMIN e houver "assign": <Suspense><AssigneeOptions/></Suspense>  (lista isolada)
```

`loadTicket` estende o padrão de `loadPanel`, tratando 404 e 400 como `notFound()`. `chamados/[id]/not-found.tsx` traz o texto "Chamado não encontrado." e o link "Voltar aos chamados". O aviso `?aviso=chamado-aberto` usa o mesmo `getListNotice`/`LIST_NOTICES` de `add-ticket-create`, renomeado para `TICKET_NOTICES` em `lib/tickets/notices.ts`, já que agora serve a duas páginas.

### 4. Mutação: uma Server Action com estado

`ticketAction(prev, formData)` em `app/(app)/chamados/[id]/actions.ts`:

1. `ticketActionSchema` (zod, união discriminada por `intent`): `{ intent: "assume", ticketId }`, `{ intent: "assign", ticketId, assigneeId: uuid }` ou `{ intent: "status", ticketId, to: TicketStatus }`. Dado inválido → `{ error: MESSAGES.invalidData }` sem chamar a API.
2. `withSession(token => assume ? assignTicket(token, id) : assign ? assignTicket(token, id, assigneeId) : updateTicketStatus(token, id, to))`. Com `assume`, o corpo vai vazio (SUPPORT não pode enviar `assigneeId`).
3. A Server Action não recalcula a matriz. A API é a autoridade, e recalcular custaria um `GET` a mais por ação.
4. Resultado:
   - Sucesso → `refresh()` e `{ notice: <mensagem da ação> }`. "Chamado atribuído a {nome}." usa o `assignee.name` da resposta.
   - 409/422 → `refresh()` e `{ error: <mensagem do spec> }`.
   - 404 → `{ gone: true }`, e a UI troca a área de ações por "Este chamado não está mais disponível para você." com o link "Voltar aos chamados".
   - Demais → `{ error: toUserMessage(error) }`.

`refresh()` (`next/cache`) re-renderiza a página com o chamado relido, de modo que status, atendente, datas e ações mudam juntos. `TicketActions` (`'use client'`) usa `useActionState`. Cada botão é um `<button name="intent" value=...>` no mesmo `<form>`, então todos ficam desabilitados com `isPending`, e só o botão acionado mostra o texto de envio. A mensagem fica numa região `aria-live="polite"`.

### 5. Confirmação de fechar com `alert-dialog`

Adicionar o `alert-dialog` do shadcn (sobre `@base-ui/react`, já instalado), ajustado aos tokens como foi feito com o `sheet`. "Fechar chamado" abre o diálogo, e o botão de confirmação é o submit com `intent=status`/`to=CLOSED`. O app não funciona sem JavaScript (ver `add-ticket-list`, design.md, Non-Goals), então o diálogo não exige nenhum caminho alternativo.

### 6. Lista de atendentes para o ADMIN

`listSupportAgents(token)` em `lib/api/users.ts` percorre `GET /users?limit=100&page=n` até cobrir o `total`, com teto de 20 páginas (2.000 usuários). Filtra `role === "SUPPORT"`, ordena por nome com `localeCompare("pt-BR")` e devolve `{ id, name }`. É envolvida em `cache` do React. Só é chamada quando o viewer é ADMIN e há ação `assign`, e roda num `Suspense` próprio para não atrasar o chamado. A falha mostra "Não foi possível carregar os atendentes." sem afetar as outras ações, e o atendente atual é removido das opções. A atribuição usa um `<select>` nativo e o botão "Atribuir"/"Reatribuir".

Alternativa descartada: um campo de busca de atendente. A API não busca usuários, então a busca seria feita sobre a mesma lista completa, sem ganho.

### 7. Abertura passa a levar ao detalhe

`createTicketAction` (de `add-ticket-create`) passa a `redirect(\`/chamados/${ticket.id}?aviso=chamado-aberto\`)`. A página `/chamados` continua aceitando o aviso, sem prejuízo. Os testes Vitest e o E2E de criação mudam o destino esperado.

### 8. Layout

Abaixo de `lg`, uma coluna: cabeçalho (título `display-sm`, chips), aviso ou mensagem, ações em largura total, informações em lista de definição (`<dl>`) e descrição. A partir de `lg`, uma grade de 12 colunas: descrição em 8 colunas e painel lateral em 4, com informações e ações. O painel usa `cloud`/`charcoal` do design system e, nas ações, botão primário para a ação principal de cada estado ("Assumir", "Resolver", "Reabrir") e secundário para as demais. "Fechar chamado" usa o estilo destrutivo (`bloom-deep`).

### 9. Testes

- **Vitest:**
  - `getTicketActions`: todas as combinações de papel × relação × 5 status, incluindo CLOSED vazio e ADMIN sem "Reabrir"/"Assumir".
  - `getCustomerNotice`.
  - `ticketActionSchema`.
  - `ticketAction` com `withSession`/API mockados: corpo vazio no `assume`, `assigneeId` no `assign`, `refresh` em sucesso, 409 e 422, `gone` no 404, 403, rede.
  - `listSupportAgents`: várias páginas, teto, filtro, ordem e sem e-mails.
  - `loadTicket`: 404/400 → notFound, 401 → login.
  - `getCurrentUser` com `id`.
- **Playwright** (`e2e/ticket-detail.spec.ts`, desktop e mobile). O ciclo usa chamados `[e2e-<timestamp>]` criados pelo helper de `add-ticket-list`, e o atendente fixo só assume chamados criados pelo próprio teste:
  1. Cliente vê "Fechar chamado" num chamado aberto.
  2. Atendente assume, coloca em "Aguardar cliente" e resolve.
  3. Cliente vê o aviso em "Aguardando cliente", reabre e fecha com confirmação (e cancela uma vez).
  4. Admin atribui ao atendente fixo e reatribui sem ver o atual nas opções.
  5. Um cliente descartável recebe "Chamado não encontrado." no chamado do cliente fixo.
  6. Página com `/chamados/abc`.
  7. Sem scroll horizontal em 360px.

## Risks / Trade-offs

- **[Risco]** `refresh()` junto com o estado devolvido pelo `useActionState` pode se comportar diferente do esperado (estado perdido ou mensagem duplicada). → Mitigação: ler `refresh.md` e o guia de Server Actions em `node_modules/next/dist/docs/` antes da task 3.1 e validar no E2E. Se falhar, trocar por `redirect` para a própria página com `?aviso=<codigo>` fechado e registrar `> Impeditivo:`.
- **[Risco]** Muitos usuários tornam a lista de atendentes lenta (até 20 requisições). → Mitigação: só para ADMIN, em `Suspense` próprio e com teto. Se a base crescer, pedir à API um filtro por papel e registrar como divergência.
- **[Trade-off]** Sem polling, um chamado aberto por muito tempo pode estar desatualizado. → Mitigação: toda ação devolve o estado real (409/422 recarregam), e "Tentar novamente"/recarregar está sempre disponível.
- **[Risco]** Os E2E alteram chamados no banco compartilhado. → Mitigação: só chamados criados pelo próprio teste, com prefixo, e nunca assumir chamados da fila que não sejam do teste.
- **[Trade-off]** Até os comentários existirem, o cliente em "Aguardando cliente" só vê o aviso. A próxima spec troca o aviso pela resposta.
