# Design

## Context

`/chamados` é uma página "em construção" dentro da route group `app/(app)/`, já protegida pelo `proxy.ts` e aberta a todos os papéis (`ROUTE_ACCESS`). A camada de dados já tem `listTickets(token, { page, limit, status, priority })` em `lib/api/tickets.ts`, e o painel já usa `loadPanel` (401 vira login, outras falhas viram `{ ok: false }`), `StatusChip`/`PriorityChip`, `STATUS_LABELS`/`PRIORITY_LABELS` e `formatDate`. A API só filtra por `status` e `priority`, ordena sempre dos mais recentes para os mais antigos e limita `limit` a 50 (`docs/api-reference.md`, "Tickets" e "Visibilidade").

## Goals / Non-Goals

**Goals:**
- A URL é a única fonte do estado da lista (filtros e página), sem estado de cliente que precise ser sincronizado.
- Filtros e paginação navegam no cliente, sem recarregar a página, com URLs limpas (sem parâmetros vazios).
- Nenhuma chamada à API sai do navegador.

**Non-Goals:**
- Busca textual, filtro por categoria ou atendente e ordenação: a API não oferece.
- Funcionar com o JavaScript desabilitado. Com `cacheComponents`, o conteúdo dentro de `<Suspense>` chega por streaming oculto e é revelado por script, então nenhuma página autenticada do app funciona sem JS. Suporte sem JS, se um dia for desejado, é uma change própria sobre a estratégia de streaming.
- Contagem por status ao lado de cada opção de filtro: exigiria cinco chamadas extras por renderização.
- Atualização automática da lista (polling).

## Decisions

### 1. Leitura em Server Component, estado na URL

`app/(app)/chamados/page.tsx` continua com `<Suspense>` em volta do conteúdo dinâmico, exigência do `cacheComponents`. Dentro dele:

```
searchParams (Promise) --await--> parseTicketListQuery() --> { status?, priority?, page }
getCurrentUser()  --> role (titulo, colunas, atalho Fila)
getAccessToken()  --> loadPanel(() => listTickets(token, { ...query, limit: 20 }))
                                    |
                    ok  -> toTicketRow[]  (DTO enxuto) --> <TicketTable rows role />
                    !ok -> <ListError />   (401 ja virou redirect para /login)
```

Título e filtros ficam fora do `Suspense` interno da lista, para continuarem visíveis durante o carregamento e na falha. O esqueleto da lista é o fallback desse `Suspense`, e ele recebe uma `key` derivada da query para reaparecer a cada troca de filtro ou página.

Alternativa descartada: um Route Handler com `fetch` no cliente. Contraria o BFF server-first e não traz ganho, porque toda mudança de filtro já é uma navegação.

### 2. Validação dos `searchParams` com zod, campo a campo

Em `lib/validation/tickets.ts`, `ticketListQuerySchema` usa `.catch(undefined)` em `status` e `priority` (enums da API) e `.catch(1)` em `page` (`z.coerce.number().int().min(1)`). Cada campo inválido é descartado sem invalidar os outros, como pede o spec "Parâmetros inválidos na URL". Valores repetidos (`?status=A&status=B`) usam o primeiro. O schema fica em `lib/validation/` para a change de detalhe reaproveitar os enums.

### 3. DTO enxuto da linha

`toTicketRow(ticket, role)` em `lib/tickets/list.ts` devolve `{ id, title, status, priority, category, createdAt, customer?, assignee? }`. `customer` e `assignee` (nome ou `null`) só são incluídos para `SUPPORT`/`ADMIN`. Descrição, e-mails e ids de usuários nunca vão para o cliente.

### 4. Filtros: formulário com navegação no cliente

`<TicketFilters>` (`'use client'`) é um `<form action="/chamados" method="get">` com dois `<select name="status|priority">` e o botão "Filtrar". No `onSubmit`, ele monta a URL com `buildListHref` (só filtros preenchidos, sempre na página 1) e navega com `router.push` dentro de `startTransition`. O `change` de cada select chama `form.requestSubmit()`, para que o filtro se aplique sem clicar no botão. O botão continua lá para quem navega por teclado. "Limpar filtros" é um `<Link href="/chamados">`. O atalho "Fila" é um `<Link href="/chamados?status=OPEN">`, renderizado só para `SUPPORT` e marcado com `aria-current` quando `status=OPEN` sem `priority`.

Alternativa descartada: `next/form`. Ele envia os selects vazios como `?status=&priority=HIGH`, e a API responde 400 a `status=` vazio. O schema descartaria esses valores, mas a URL ficaria suja e diferente da usada pelos links do painel.

### 5. Paginação por links

`buildListHref({ status, priority }, page)` em `lib/tickets/list.ts` monta a URL preservando os filtros e omitindo `page=1`. `getPagination(total, page, limit)` devolve `{ totalPages, hasPrev, hasNext, outOfRange }`. "Anterior" e "Próxima" são `<Link>` e, quando indisponíveis, viram `<span aria-disabled="true">`. Com `outOfRange` (`page > totalPages` e `total > 0`), a página mostra "Esta página não tem chamados." com o link para `buildListHref(filtros, 1)`.

### 6. Uma única marcação para mobile e desktop

A lista é um `<ul>` em que cada `<li>` contém um único `<Link>` com a linha inteira. Abaixo de `md` o link é um card empilhado. A partir de `md` ele vira uma grade CSS com as mesmas colunas de um cabeçalho visual. O cabeçalho é `aria-hidden` e cada célula tem um rótulo `sr-only` quando necessário.

Alternativa descartada: `<table>` no desktop e cards no mobile. Seriam duas árvores de DOM com o mesmo conteúdo, e uma linha de tabela inteira clicável exige JavaScript ou links aninhados.

### 7. Estados vazios por papel

`EmptyList` decide a mensagem a partir de `{ role, hasFilters, outOfRange }`, seguindo o spec "Lista vazia". O botão "Abrir chamado" do cliente reaproveita o `PRIMARY_ACTION` de `lib/navigation/config.ts`.

### 8. Testes

- **Vitest:** `ticketListQuerySchema` (válidos, inválidos, repetidos, vazios), `buildListHref` (preserva filtros, omite `page=1`), `getPagination` (limites, página única, fora do intervalo) e `toTicketRow` (campos por papel, sem descrição nem e-mail).
- **Playwright** (`e2e/ticket-list.spec.ts`, desktop e mobile): um helper cria chamados pelo `POST /tickets` com o cliente fixo e um prefixo `[e2e-<timestamp>]`. Os testes verificam filtro por prioridade (todos os chips exibidos batem), filtros combinados zerando a página, parâmetro inválido descartado, cliente sem coluna de atendente, admin com "Na fila", atalho "Fila" do atendente e ausência de scroll horizontal em 360px. A paginação é verificada com o admin, que vê todos os chamados: depende de existirem mais de 20, o que o helper garante criando os que faltarem. Nenhum teste depende de totais exatos.

## Risks / Trade-offs

- **[Risco]** A API pode rejeitar `page` além do total (400) em vez de devolver `data: []`. → Mitigação: `listTickets` é chamado com o `page` validado e, se vier 400 com `page > 1`, a página trata como `outOfRange`. Conferir o comportamento real no início da implementação e registrar na task.
- **[Trade-off]** Sem ordenação por prioridade, o atendente vê a fila por data. → Mitigação: filtro de prioridade e atalho "Fila". A limitação está declarada no proposal.
- **[Risco]** O E2E de paginação cria chamados no banco compartilhado. → Mitigação: só cria o necessário para passar de 20, sempre com prefixo, e nunca depende de contagens exatas.
- **[Trade-off]** O esqueleto reaparece a cada troca de filtro, porque a `key` do `Suspense` muda. Isso é preferível a manter a lista antiga visível com filtros novos, o que seria enganoso.
