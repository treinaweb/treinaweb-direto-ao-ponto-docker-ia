# Design

## Context

`/categorias` já exige `ADMIN` (`requireRole("ADMIN")` dentro de `Suspense`, que responde "não encontrado" aos demais) e mostra `ComingSoon`. `lib/api/categories.ts` só tem `listCategories(token)` (`GET /categories`), e o tipo `Category` já traz `active?`. Para ADMIN a API devolve todas as categorias com `active`, ordenadas por nome. `getCategorySummary` (dashboard) já trata `active` ausente como ativa. O projeto já tem os padrões necessários:

- **Leitura:** `loadPanel` (401 vira login, o resto vira falha exibível) e `PanelError` com "Tentar novamente".
- **Mutação:** Server Action com `useActionState` (`createTicketAction`). Valores em `FormState`, 400 traduzido por `parseValidationMessages` + `issuesToFieldErrors`, `withSession` para o refresh reativo com single-flight e `refresh()` (`next/cache`) para reler a página na mesma resposta que leva o estado ao cliente. Isso foi confirmado em `add-ticket-create` e `add-ticket-detail`.
- **Botões que compartilham um formulário:** em `ticket-actions.tsx` e `close-ticket-button.tsx`, botões com `name="intent"`, ligados pelo atributo `form`, ficam todos desabilitados com o `pending`.
- **Diálogo:** `alert-dialog` (shadcn sobre `@base-ui/react`). O `@base-ui/react/dialog` já é usado pelo `sheet`.

Comportamento verificado na API real (outubro de 2026):

- `POST` responde 201 `{id, name, active: true}`.
- Nome exatamente igual responde 409 "Já existe uma categoria com esse nome". O mesmo nome com outra caixa responde 201.
- `PATCH {}` responde 400 "Informe name e/ou active". `PATCH` com nome duplicado responde 409. `PATCH {active:false}` responde 200. Renomear uma categoria inativa responde 200.
- A API faz o trim dos nomes.
- As mensagens 400 do class-validator vêm em inglês.

## Goals / Non-Goals

**Goals:**
- Os mesmos padrões de leitura e mutação de chamados, sem abstrações novas além do diálogo.
- Toda ação termina com a lista relida da API: o que aparece na tela é sempre o estado real.
- A API é a fonte da verdade da unicidade. O frontend só valida o tamanho.

**Non-Goals:**
- Excluir categoria: a API não oferece.
- Busca, filtro, ordenação própria ou paginação: a API devolve tudo por nome, e são cerca de 20 categorias.
- Mostrar quantos chamados usam cada categoria: a API não informa.
- Funcionar sem JavaScript: as páginas autenticadas dependem de script com `cacheComponents` (ver `add-ticket-list`, design.md). O diálogo segue a mesma premissa.
- Atualização em tempo real quando outro administrador altera a lista.

## Decisions

### 1. Leitura no Server Component

```
/categorias (Server Component)
  <h1>Categorias</h1> + explicação fixa sobre desativação   (dentro do Suspense, depois do requireRole)
  requireRole("ADMIN")              -> notFound() para os demais, sem tocar em /categories
  getAccessToken()
  loadPanel(() => listCategories(token))
     ok, []    -> <CategoryAdmin categories={[]} />    (estado vazio + "Nova categoria")
     ok, [..]  -> <CategoryAdmin categories={[{ id, name, active }]} />
     !ok       -> <PanelError message="Não foi possível carregar as categorias." />
                  (401 já virou redirect para /login)
```

O DTO enviado ao cliente é `{ id, name, active }`, com `active: c.active !== false`, a mesma convenção de `getCategorySummary`. A ordem é a da API, sem reordenar no frontend. O título fica dentro do `Suspense`, depois do `requireRole`, como em `/chamados/novo`, para que o HTML estático não revele a página a outros papéis.

### 2. Cliente da API e DTOs

`CreateCategoryDto { name }` e `UpdateCategoryDto { name?; active? }` entram em `lib/api/types.ts`. Em `lib/api/categories.ts` entram `createCategory(token, dto)` (`POST /categories`) e `updateCategory(token, id, dto)` (`PATCH /categories/{id}`, com `encodeURIComponent` no id). Ambos devolvem `Category`. Renomear manda só `{ name }`, e ativar ou desativar manda só `{ active }`, de modo que um nunca altera o outro.

### 3. Validação e mensagens

`lib/validation/categories.ts`:

- `categoryNameSchema`: `z.string().trim().min(2).max(60)`, com a mensagem "O nome deve ter entre 2 e 60 caracteres." nos dois limites.
- `createCategorySchema = { name }`.
- `renameCategorySchema = { categoryId: z.uuid(), name, currentName: z.string() }`.
- `toggleCategorySchema`: lê o `intent` do botão, `activate:<uuid>` ou `deactivate:<uuid>`, e o converte em `{ categoryId, active }`.

Nenhuma regra de unicidade ou de caixa no frontend. `lib/categories/messages.ts` centraliza os textos do spec: sucesso de cada ação, `duplicateName`, `gone`, a explicação fixa e o estado vazio. `lib/categories/form-state.ts` define os estados das ações.

### 4. Server Actions

Em `app/(app)/categorias/actions.ts`, três ações no padrão de `createTicketAction`. Todas validam antes da API, usam `withSession` e, em sucesso ou 404, chamam `refresh()`.

```
createCategoryAction(prev, fd)  -> CategoryNameState
renameCategoryAction(prev, fd)  -> CategoryNameState
toggleCategoryAction(prev, fd)  -> CategoryToggleState

CategoryNameState   = FormState<"name","name"> & { done?: { notice?: string }; gone?: true }
CategoryToggleState = { notice?: string; error?: string }

resultado da API       nome (criar/renomear)                       ativar/desativar
---------------------  ------------------------------------------  ------------------------------
2xx                    refresh(); done.notice ("criada"/"renomeada")  refresh(); notice
zod inválido           fieldErrors.name, values.name (bruto)       error: invalidData
409                    fieldErrors.name = duplicateName, values    error: toUserMessage (conflito)
404                    refresh(); gone: true                       refresh(); error: gone
400                    issuesToFieldErrors({ name }) ou formError   error: invalidData
403 / rede / 5xx       formError: toUserMessage, values            error: toUserMessage
401                    withSession: renova uma vez; se falhar, /login?aviso=sessao-expirada
```

- **Nome não alterado:** `renameCategoryAction` compara o nome digitado (com trim) com `currentName` (campo oculto) e, se forem iguais, devolve `{ done: {} }` sem chamar a API. O campo oculto serve só para evitar uma requisição inútil e não decide nenhuma permissão. Se ele for adulterado, o pior caso é um `PATCH` com o mesmo nome, que a API trata. A comparação diferencia maiúsculas de minúsculas, como a API, então "Acesso" → "ACESSO" é enviado.
- **Valores brutos em `values.name`:** o nome volta exatamente como foi digitado, com os espaços, para o campo não mudar sob o usuário.
- As ações não conferem o papel antes de chamar a API. A API é a autoridade e devolve 403, que já tem mensagem. Mesmo critério de `createTicketAction`.

Alternativa descartada: uma única action com `intent` para tudo. Criar e renomear têm campos e estados diferentes, e o diálogo de nome precisa de `fieldErrors`/`values`, que o toggle não usa. Separadas, cada uma fica pequena e testável.

### 5. Composição no cliente

```
<CategoryAdmin categories>                     'use client' (raiz das interações)
  <ResultRegion message tone />                role="status" (sucesso) | role="alert" (erro), aria-live
  <CategoryNameDialog mode="create" onResult>  botão "Nova categoria" + diálogo
  <form id="category-toggle" action={toggle} />   formulário vazio, irmão da lista
  <ul> por categoria (key = id):
     nome · <CategoryStatusChip active> · "Renomear <nome>" (CategoryNameDialog mode="rename")
                                         · "Desativar|Ativar <nome>" (submit, form="category-toggle",
                                            name="intent", value="deactivate:<id>"|"activate:<id>")
```

- `CategoryAdmin` guarda a última mensagem (`{ text, tone }`) e a substitui a cada resultado, seja do diálogo (via `onResult`), seja do toggle (efeito sobre o novo `state` do `useActionState`). Fica uma região só, fora do diálogo, que sobrevive ao fechamento dele.
- **Toggle:** um único `useActionState`. Os botões apontam para o formulário pelo atributo `form`, então nenhum `<form>` fica aninhado (o diálogo de renomear é renderizado num portal, mas a árvore React é a mesma). Com `pending`, todos os botões de ativar e desativar ficam desabilitados. Só o acionado mostra "Desativando..." ou "Ativando..." (lido de `useFormStatus().data`, como em `CloseTicketButton`). Sem confirmação.
- **Nomes acessíveis:** cada botão tem texto visível ("Renomear", "Desativar") e o nome da categoria em `sr-only`, resultando em "Renomear Acesso". O E2E localiza os botões por esse nome.
- **Estado vazio:** `CategoryAdmin` com lista vazia mostra a mensagem do spec no lugar da `<ul>`, mantendo "Nova categoria".

### 6. Diálogo de nome

Adicionar o componente shadcn `dialog` (`@base-ui/react/dialog`, já instalado), ajustado aos tokens como `alert-dialog` e `sheet` (raio `rounded-panel`, sombra "Floating Modal", título em `display-xs`, `max-w-[calc(100%-2rem)]` para caber em 360px). `alert-dialog` não serve aqui: ele é para confirmações, e este diálogo é um formulário que fecha com Esc e com clique fora.

`CategoryNameDialog` (`'use client'`):

- **Abertura e foco:** `open` é controlado. O botão gatilho fica fora do popup, com `ref`, e é passado como `finalFocus` do popup. O campo "Nome" é o `initialFocus`. O Base UI prende o foco e fecha com Esc. Antes de implementar, conferir esses nomes de prop na versão instalada de `@base-ui/react`.
- **Estado novo a cada abertura:** o conteúdo do formulário, com o seu `useActionState`, fica num componente que só monta com o diálogo aberto e ganha `key` por abertura. Fechar descarta erros e valores, e reabrir começa limpo (spec "Reabrir depois de um erro").
- **Valor preservado:** o campo é controlado (`useState(initialName)`). O React reinicia os campos não controlados depois de uma action de formulário, o mesmo problema que levou ao `key` nos selects de `NewTicketForm`. Com o campo controlado, o valor digitado continua. Depois de um erro, um efeito devolve o foco ao campo.
- **Fechar no sucesso:** um efeito sobre o `state` faz o seguinte. Com `done`, chama `onResult(done.notice)` e fecha. Com `gone`, chama `onResult(gone, "error")` e fecha. Em ambos, o foco volta ao gatilho. Se o gatilho "Renomear" tiver saído do DOM, o que não acontece porque o item tem `key` estável e não há exclusão, o Base UI devolve o foco ao `body`. Ver Riscos.
- **Envio único:** `SubmitButton` com `pending` ("Criar"/"Criando..." ou "Salvar"/"Salvando..."). Uma região `sr-only` anuncia o envio, como em `NewTicketForm`. "Cancelar" fica desabilitado durante o envio, para o diálogo não fechar com a resposta ainda pendente.
- **Activity (Next 16 com `cacheComponents`):** o Next preserva o estado de páginas ocultas por até 3 rotas, inclusive um diálogo aberto (`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`, "Dialog and initialization logic"). O `open` é fechado na limpeza de um `useLayoutEffect`, para o diálogo não reaparecer aberto ao voltar para `/categorias`.

### 7. Chip de estado

`components/tickets/chip.tsx` passa a exportar o `Chip` genérico, com ponto e texto, sem mudar `StatusChip`/`PriorityChip`. `components/categories/category-status-chip.tsx` usa os mesmos tons já validados em contraste AA nos dois temas:

- "Ativa": `bg-chart-green text-ink`, o tom de "Resolvido".
- "Inativa": `bg-fog text-graphite`, o tom de "Fechado".

Alternativa descartada: um tom novo. O design system pede para não introduzir cores fora das famílias existentes.

### 8. Layout

O cabeçalho mostra o título `display-sm` e, ao lado, "Nova categoria" (botão primário, em largura total no mobile). Abaixo vem a explicação fixa em `caption`/`muted-foreground` e, depois, a região de resultado. A lista fica num painel `cloud`/`charcoal`, `rounded-xl`, com `<ul>` e divisórias:

- **`< md`:** cada `<li>` é um cartão em coluna. Nome (`body-emphasis`, `break-words`) e chip ficam numa linha que quebra, e os dois botões ficam lado a lado em `grid-cols-2`, com `min-h-11`.
- **`≥ md`:** `grid-cols-[1fr_auto_auto]`, com nome, chip e ações na mesma linha. As ações usam botões secundários (contorno). "Desativar" não usa o estilo destrutivo, porque a ação é reversível.

### 9. Testes

- **Vitest:**
  - `categoryNameSchema`: limites 1/2/60/61 com e sem espaços, só espaços, mensagem pt-BR.
  - `toggleCategorySchema`: `activate`/`deactivate` válidos, UUID inválido, intent desconhecido.
  - `createCategory`/`updateCategory` em `endpoints.test.ts`: método, rota, corpo e Bearer.
  - As três actions, com o `withSession` real e só a API mockada: sucesso com `refresh`, validação sem chamar a API, 409 no campo, 404 com `refresh` e `gone`, 400 conhecido e desconhecido, 403, rede, 401 com renovação e repetição única, 401 com renovação recusada indo ao login, nome não alterado sem chamada, mudança só de caixa enviada.
  - `CategoryNameDialog` com Testing Library: foco inicial, Esc devolvendo o foco ao gatilho, valor preservado e reabertura limpa.
- **Playwright** (`e2e/category-admin.spec.ts`, desktop e mobile, admin fixo):
  1. Criar pela tela com `e2eTitle("Categoria")` (limitado a 60), ver "Categoria criada." e o item "Ativa".
  2. Duplicado com valor preservado.
  3. Nome curto sem criar nada.
  4. Renomear e Esc devolvendo o foco.
  5. Desativar sem confirmação, conferir via API que o cliente fixo não recebe mais a categoria, e reativar.
  6. Nenhum "Excluir".
  7. 360px sem scroll horizontal e com botões ≥ 44px.

  Toda categoria criada pelo teste é localizada pelo nome via API e deixada **inativa** num `afterEach`/`finally`, para não aparecer no select dos clientes. O teste não depende do total nem da ordem global da lista.

## Risks / Trade-offs

- **[Risco]** Depois de renomear, a categoria muda de posição na lista (ordem por nome), e o React move o `<li>`. Mover um nó no DOM pode tirar o foco do botão "Renomear". → Mitigação: o diálogo usa `finalFocus` com o `ref` do gatilho, que continua o mesmo elemento, e o E2E confere o foco depois de renomear. Se o foco se perder, focar o gatilho num efeito depois do `refresh` e registrar como `> Impeditivo:`.
- **[Risco]** Não se sabe se `PATCH` com o próprio nome atual responde 200 ou 409. → Mitigação: a action não chama a API quando o nome não muda, e a task 1.2 sonda o caso na API real e registra o resultado.
- **[Trade-off]** Sem paginação, uma base com centenas de categorias deixaria a página longa. Hoje são cerca de 20, e a API não pagina. Se crescer, a busca exige um endpoint novo, a ser registrado como divergência.
- **[Trade-off]** Sem confirmação, um clique errado em "Desativar" tira a categoria dos clientes até alguém reativá-la. É reversível em um clique, e a mensagem e o chip deixam o efeito visível na hora.
- **[Risco]** Os E2E criam categorias que não podem ser excluídas no banco compartilhado. → Mitigação: prefixo `[e2e-...]` único, desativação garantida em `finally` e nenhuma dependência de totais. Fica um acúmulo de categorias inativas, já aceito pelas diretrizes (seção 5).
- **[Risco]** Dois administradores ao mesmo tempo podem ver a lista desatualizada. → Mitigação: cada ação relê a lista, ativar/desativar é idempotente na API e 404/409 têm mensagem própria.

## Migration Plan

Não há migração de dados. A change só substitui o `ComingSoon` de `/categorias` e acrescenta código. Rollback: reverter os commits da change. `/categorias` volta a ser "em construção", sem efeito na API.
