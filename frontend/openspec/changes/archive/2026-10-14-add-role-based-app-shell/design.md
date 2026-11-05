# Design

## Context

- Motivação e escopo em `proposal.md`; comportamento em `specs/app-shell`, `specs/role-dashboard` e no delta de `specs/auth-session`.
- Estado atual: `app/dashboard/page.tsx` monta o próprio top bar (marca, nome/papel, `LogoutButton`) e uma saudação. A fundação da change `add-auth-session` já existe: `apiFetch` (`lib/api/client.ts`, `server-only`, `ApiError`), `getCurrentUser()` (`lib/auth/dal.ts`, React `cache`, redireciona em 401 sem renovar), `proxy.ts` (refresh preventivo e redirecionamento por `PROTECTED_ROUTES`), `ROLE_LABELS`, `error.tsx` e `not-found.tsx` em pt-BR.
- Next 16.4 com `cacheComponents: true`. Pelo guia `02-guides/authentication-with-cache-components.md`, a leitura da sessão fica **dentro de `<Suspense>`**, nunca no topo de um layout, para não segurar o segmento inteiro.
- A API não tem endpoint de agregação. `GET /tickets` aceita `page`, `limit` (máx. 50), `status` e `priority` (conferido em `/docs-json`) e devolve `total`, já restrito à visibilidade do papel. `GET /users` (ADMIN) devolve `total`; `GET /categories` devolve a lista completa (com `active` só para ADMIN).
- `globals.css` tem os tokens `--ds-*` de primary, superfícies, ink e bloom, mas **não** tem `storm` nem a paleta de gráficos. Não há componentes `sheet` ou `tooltip` instalados.

## Goals / Non-Goals

**Goals:**
- Uma única fonte de verdade para "que itens o papel vê" e "que papel acessa cada rota", testável sem renderizar.
- Moldura estática (marca, estrutura) pré-renderizável; só as partes que dependem do usuário entram em `Suspense`.
- Cada painel do dashboard carrega e falha de forma isolada.
- Zero JS no cliente para gráficos; Client Components só para item ativo, breadcrumb, drawer e "Tentar novamente".

**Non-Goals:**
- Ações no painel (assumir chamado, mudar status): ficam para a change de chamados.
- Cache entre requisições dos números do painel (`use cache`): os valores dependem do token e mudam com frequência.
- Seletor manual de tema, rail direito, busca ⌘K e notificações.
- Conteúdo real das páginas stub.

## Decisions

### 1. Route group `(app)` com layout próprio

```
app/
  (auth)/            login, cadastro          (layout atual, sem moldura)
  (app)/
    layout.tsx       moldura: <AppSidebar/> + <TopBar/> + {children}
    error.tsx        erro dentro da moldura (mesmo texto do app/error.tsx)
    dashboard/       page.tsx (movida de app/dashboard; URL continua /dashboard)
    chamados/        page.tsx | novo/page.tsx | [id]/page.tsx      (stubs)
    categorias/      page.tsx                                       (stub)
    usuarios/        page.tsx                                       (stub)
```

O layout não faz `await` da sessão. Ele renderiza a estrutura e coloca em `<Suspense>` as ilhas que dependem do usuário (navegação, área do usuário, breadcrumb).

```
+-- (app)/layout.tsx ------------------------------------------------+
| <aside> hidden md:flex                  | <div workspace>          |
|   <Brand/>                    (estático) |  <TopBar>                |
|   <Suspense fallback=NavSkeleton>        |    <MobileNav/> md:hidden|
|     <RoleNav/>  server: getCurrentUser   |    <Suspense>            |
|       -> getNavigation(role)             |      <Breadcrumbs/>      |
|       -> <NavLinks items/> client        |    </Suspense>           |
|   <Suspense fallback=UserSkeleton>       |  </TopBar>               |
|     <UserArea/> nome, papel, Sair        |  <main>{children}</main> |
+------------------------------------------+--------------------------+
```

Alternativa considerada: manter cada página montando a própria moldura (como o `dashboard` atual). Rejeitada porque duplicaria navegação e controle de acesso em cada página.

### 2. Navegação e acesso por papel em `lib/navigation`

Um módulo puro (sem `server-only`, sem React) define as rotas e quem as acessa:

```ts
// lib/navigation/config.ts (forma, não código final)
type NavItem = { href: Route; label: string | Record<Role, string>; icon: IconKey; roles: Role[] };
NAV_GROUPS = [
  { label: null,            items: [Painel(todos), Chamados(todos; CUSTOMER="Meus chamados")] },
  { label: "Administração", items: [Categorias(ADMIN), Usuários(ADMIN)] },
]
PRIMARY_ACTION = { href: "/chamados/novo", label: "Abrir chamado", roles: ["CUSTOMER"] }
ROUTE_ACCESS   = { "/chamados/novo": ["CUSTOMER"], "/categorias": ["ADMIN"], "/usuarios": ["ADMIN"] }

getNavigation(role) -> grupos filtrados (grupo vazio some) + ação primária
canAccess(role, pathname) -> boolean   (prefixo mais específico vence)
isActive(pathname, href) -> boolean    ("/chamados/novo" ativa "/chamados")
breadcrumbFor(role, pathname) -> [{label, href?}]
```

- Os ícones viajam como **chave** (`IconKey`), não como componente: Server Components não podem passar funções a Client Components. `NavLinks` (client) mapeia a chave para o ícone `lucide-react`.
- Gate no servidor: `requireRole(...roles)` em `lib/auth/dal.ts` chama `getCurrentUser()` e, se o papel não estiver na lista, chama `notFound()`. Cada página restrita chama `requireRole` antes de qualquer acesso à API.
- `notFound()` em vez de `forbidden()`: `forbidden()` exige a flag experimental `authInterrupts`, e responder 404 segue a mesma semântica da API (fora da visibilidade = não encontrado).
- `PROTECTED_ROUTES` (`lib/auth/routes.ts`) ganha `/chamados`, `/categorias` e `/usuarios`. O proxy continua só com checagem otimista de cookie; o papel é verificado no DAL.

Alternativa considerada: verificar o papel no `proxy.ts`. Rejeitada porque o proxy não deve chamar `GET /users/me` em toda requisição e as diretrizes reservam a verificação real ao DAL.

### 3. Camada de dados do painel

```
lib/api/tickets.ts     listTickets(token, {page, limit, status?, priority?}) -> Paginated<Ticket>
                       countTickets(token, filtros) = listTickets(limit: 1).total
lib/api/categories.ts  listCategories(token) -> Category[]
lib/api/users.ts       + listUsers(token, {page, limit}) -> Paginated<PublicUser>
lib/auth/dal.ts        + getAccessToken()  (cookie; sem token -> redirect login)
                       + requireRole(...roles)
lib/dashboard/         (server-only) uma função por bloco, retornando DTOs enxutos:
  customer.ts          getCustomerKpis, getAttentionTickets, getRecentTickets
  support.ts           getSupportKpis, getQueueTickets, getQueueByPriority
  admin.ts             getStatusCounts, getPriorityCounts, getCategorySummary, getUserSummary
```

- `countTickets` fica envolvido em React `cache()` por argumentos. Assim, os 5 totais por status do ADMIN alimentam os cartões **e** o donut com uma chamada cada.
- Chamadas por carregamento do painel: CUSTOMER 7 (4 contagens, 2 listas de "atenção", 1 de recentes); SUPPORT 9 (4 contagens, 1 lista da fila, 4 contagens por prioridade com `status=OPEN`); ADMIN 11 (5 por status, 4 por prioridade, categorias, usuários). Todas em paralelo, dentro do seu `Suspense`.
- O estado vazio do cliente usa a lista de recentes: se ela vier vazia, o cliente não tem nenhum chamado em nenhum status.
- DTOs enviados aos componentes: só `id`, `title`, `status`, `priority`, nome da categoria, nome do cliente e `createdAt`.

### 4. Falha e carregamento por painel

Cada painel é um Server Component assíncrono dentro do seu `<Suspense fallback={<PanelSkeleton/>}>`:

```
async function QueuePanel() {
  const result = await loadPanel(() => getQueueTickets())   // nunca lança, exceto redirect
  if (!result.ok) return <PanelError/>                      // "Não foi possível carregar estes dados."
  return <QueueList items={result.data}/>
}
```

- `loadPanel` converte `ApiError` 401 em `redirect(loginUrl({ notice: "sessao-expirada" }))`, **fora** do `try/catch` (o `redirect` lança um erro de controle que não pode ser engolido), e qualquer outra falha em `{ ok: false }`.
- `PanelError` inclui o botão client "Tentar novamente", que chama `router.refresh()`.
- Não usamos `error.tsx` para isso porque ele substitui o segmento inteiro, e a spec exige isolamento por painel. O `(app)/error.tsx` cobre só falhas da página (por exemplo, `GET /users/me` com 5xx).

### 5. Gráficos em SVG no servidor

- `DonutChart`: um `<circle>` por fatia com `stroke-dasharray`/`stroke-dashoffset`, anel grosso e legenda ao lado (abaixo no mobile) com rótulo, número e percentual.
- `BarChart`: `<rect>` com topo arredondado (raio `lg`), rótulo e valor sob cada barra.
- `Meter` (fila por prioridade): `div` com largura proporcional, sem SVG.
- Acessibilidade: `<svg role="img" aria-label="Chamados por status: Abertos 3, ...">`. A legenda visível com os números é a alternativa textual.
- Percentuais com `Intl.NumberFormat('pt-BR', { style: 'percent' })`. Os restos de arredondamento não precisam fechar 100%.

Alternativa considerada: Recharts. Rejeitada porque exigiria `'use client'`, aumentaria o bundle e não é necessária para 4–5 séries estáticas.

### 6. Tokens, rótulos e chips

- `globals.css` ganha `--ds-storm-mist #8ebdce`, `--ds-storm-sea #7fadbe`, `--ds-storm-deep #356373` (do design system) e a paleta de gráficos tirada das referências: `--ds-chart-blue #a0bce8`, `--ds-chart-mint #6de0cd`, `--ds-chart-green #71dd8c`, `--ds-chart-violet #b899eb`. Todos expostos como `--color-*` do Tailwind.
- Cores por status: Aberto `primary`, Em andamento `storm-deep`, Aguardando cliente `storm-mist`, Resolvido `chart-green`, Fechado `graphite`. Por prioridade: Urgente `bloom-coral`, Alta `bloom-rose`/`bloom-deep`, Média `primary-soft`/`primary-deep`, Baixa `cloud`/`graphite` (`chip-priority` do design system).
- `lib/tickets/labels.ts` (puro) concentra `STATUS_LABELS`, `PRIORITY_LABELS` e a ordem de exibição, reaproveitáveis pela futura change de chamados. `components/tickets/status-chip.tsx` e `priority-chip.tsx` sempre exibem ponto colorido mais texto.
- Uso de `primary` por viewport: indicador do item ativo e botão "Abrir chamado". O botão do estado vazio do cliente usa o estilo `button-ink`, para não passar de dois usos.

### 7. Responsividade da moldura

| Largura | Sidebar | Top bar |
|---|---|---|
| `< md` (768) | oculta; `Sheet` (shadcn) da esquerda com `NavLinks` + `UserArea` | botão "Abrir menu", página atual |
| `md`–`lg` | `w-16`, só ícones; rótulo em `sr-only` + `Tooltip` (shadcn) no foco/toque | breadcrumb completo |
| `>= lg` (1024) | `w-[212px]` com ícones e rótulos | breadcrumb completo |

- O `Sheet` (sobre `@base-ui/react` Dialog) já entrega foco preso, Esc, toque fora e retorno do foco. Para fechar ao navegar, o `onClick` do link chama `setOpen(false)`.
- O `UserArea` é renderizado no servidor uma vez e passado como `children`/slot para a sidebar e para o `Sheet`, sem duplicar a chamada à API (`getCurrentUser` já é memorizado por renderização).

### 8. Testes

- **Vitest:** `lib/navigation` (itens por papel, `canAccess` incluindo prefixos e subrotas, `isActive`, breadcrumb), `lib/api/tickets|categories|users` (método, rota, query e Bearer), `lib/dashboard/*` com `apiFetch` mockado (agregação, DTO enxuto, empty state), `loadPanel` (401 → redirect, 5xx/rede/403 → `ok:false`), percentuais e formatação pt-BR, `requireRole` (permitido, `notFound`).
- **Playwright** (desktop + mobile, API real):
  - navegação por papel com os usuários fixos;
  - 404 de `/usuarios`, `/categorias` e `/chamados/novo` para os papéis sem acesso;
  - painel por papel: rótulos e estrutura, sem assertar totais, por causa do isolamento;
  - cliente descartável (`POST /users`): estado vazio e, depois de criar um chamado via API com título `[e2e-<ts>]`, o chamado em "Chamados recentes";
  - drawer: abrir, Esc, navegar;
  - sem scroll horizontal em 360px.
- Os E2E existentes que clicam em "Sair" passam a usar um helper `logout(page)`, que no mobile abre o drawer antes.

## Risks / Trade-offs

- [Até 11 requisições à API por carregamento do painel do ADMIN] → paralelas, com `cache()` para deduplicar e `Suspense` por painel. Se a API impuser rate limit, a mitigação futura é reduzir os painéis ou buscar uma página de 50 e agregar no BFF.
- [Os números não são um snapshot atômico; cartões e donut podem divergir por um instante se um chamado mudar no meio do carregamento] → aceitável para um painel. Os cartões e o donut do ADMIN usam as mesmas chamadas deduplicadas.
- [Semântica de `status` + `priority` combinados não está escrita no Swagger] → a task de `lib/dashboard/support.ts` verifica contra a API real que os dois filtros funcionam como "E". Se não funcionarem, o painel "Fila por prioridade" passa a contar a partir da lista da fila (até 50 itens), e isso fica registrado como `> Impeditivo:`.
- [Papel alterado com sessão ativa] → a API revoga as sessões. Na próxima navegação o proxy ou o DAL levam ao login, e a navegação é sempre montada a partir de `GET /users/me` da requisição.
- [Links para `/chamados/{id}` e `?status=` levam a stubs] → intencional nesta change. As páginas reais virão nas próximas changes, já protegidas.
- [O `Sheet`/`Tooltip` do shadcn podem gerar variantes fora dos tokens] → ajustar as classes geradas para os tokens do design system, como já foi feito com `button`, `input` e `card`.

## Migration Plan

- `app/dashboard/` move para `app/(app)/dashboard/` sem mudar a URL. Os links e o `DEFAULT_AFTER_LOGIN` continuam válidos.
- Os E2E de sessão e cadastro são atualizados na mesma change (helper `logout`).
- Rollback: reverter a change. Não há dados nem cookies novos.
