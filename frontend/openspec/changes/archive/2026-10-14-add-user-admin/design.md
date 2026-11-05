# Design

## Context

`/usuarios` já exige `ADMIN` (`requireRole("ADMIN")`, que responde "não encontrado" aos demais) e mostra `ComingSoon`. `ROUTE_ACCESS` em `lib/navigation/config.ts` restringe o prefixo `/usuarios`, então `/usuarios/novo` já herda a regra no `proxy.ts`, no breadcrumb e no `canAccess`. A camada de dados tem `listUsers(token, { page, limit })` em `lib/api/users.ts` (usado hoje por `listSupportAgents`). O projeto já tem os padrões que esta change repete:

- **Lista paginada pela URL:** `/chamados` (`app/(app)/chamados/page.tsx`): `searchParams` validados com zod, `Suspense` com `key` por página, `loadPanel` (401 vira login, o resto vira falha exibível), `getPagination` e `TicketPagination` com links.
- **Formulário em página própria:** `/chamados/novo` e `/cadastro`: Server Action + `useActionState`, `readFormFields` → schema → `withSession` → `FormState` com `fieldErrors`, `formError` e `values`, 400 traduzido por `parseValidationMessages` + `issuesToFieldErrors`, `redirect` com `withNotice` fora do `try/catch`.
- **Confirmação em diálogo:** `CloseTicketButton` com `AlertDialog` (base-ui), e resultado de ação num estado de `useActionState` que sobrevive ao `refresh()` (`TicketActions`).

Comportamento real da API, conferido em out/2026: `GET /users` vem dos mais antigos para os mais recentes (cerca de 490 usuários hoje, a maioria criada pelos E2E), sem busca nem filtro; `POST /users/staff` responde 400 para `role: CUSTOMER` e 409 "E-mail já cadastrado"; `PATCH /users/{id}/role` responde 422 "Não é permitido alterar o próprio papel" para o próprio usuário, 200 sem efeito para o mesmo papel e 404 "Usuário não encontrado" para id desconhecido. Rebaixar um atendente não mexe nos chamados dele: um chamado `IN_PROGRESS` continua atribuído à pessoa, agora `CUSTOMER`, e o ADMIN pode reatribuí-lo pelo detalhe.

## Goals / Non-Goals

**Goals:**
- Repetir os padrões existentes (lista pela URL, formulário em página, diálogo de confirmação) sem abstrações novas além de um componente de paginação genérico.
- Nenhuma chamada à API sai do navegador. Leituras em Server Components, mutações em Server Actions, nenhum Route Handler.
- Nenhuma senha volta ao navegador e nenhum texto da API é exibido.

**Non-Goals:**
- Busca, filtro por papel e ordenação: `GET /users` não oferece. Filtrar no servidor percorrendo todas as páginas custaria cerca de 5 chamadas de 100 por renderização (e crescendo), e filtrar só a página atual seria enganoso. Fica para quando a API oferecer.
- Editar, excluir ou desativar usuários: a API não oferece.
- Verificar chamados atribuídos antes de rebaixar alguém: exigiria percorrer `GET /tickets` inteiro (máx. 50 por página) sem filtro por atendente. O diálogo mostra um aviso genérico.
- Invalidar na hora as permissões do usuário afetado: depende da API (ver Riscos).
- Funcionar com o JavaScript desabilitado, pelo mesmo motivo de `add-ticket-list` (streaming com `cacheComponents`).

## Decisions

### 1. Lista em Server Component, página na URL

```
/usuarios (page.tsx)
  <Suspense fallback={ListSkeleton}>
    Content: requireRole("ADMIN")            -> notFound() para os demais, antes de GET /users
             await searchParams -> parseUserListQuery() -> { page }
             getUserNotice(params.aviso)      -> "Usuario cadastrado." ou nada
             titulo "Usuarios" + botao "Novo usuario" + aviso   (fora do Suspense interno)
             <RoleChangeProvider>             (client: live region + dialogo unico)
               <Suspense key={buildUsersHref(page)} fallback={UserTableSkeleton}>
                 Results: getAccessToken()
                          loadPanel(() => listUsers(token, { page, limit: 25 }))
                            ok  -> toUserRow(user, currentUser.id)[] -> <UserTable rows />
                                   + <UserCount> + <PageNav>
                                   ou "Esta pagina nao tem usuarios." (outOfRange)
                            !ok -> <PanelError message="Nao foi possivel carregar os usuarios." />
                                   (401 ja virou redirect para /login)
```

- `parseUserListQuery` em `lib/validation/users.ts`: `page` com `z.coerce.number().int().min(1).catch(1)`, primeiro valor se repetido, chaves desconhecidas (como `aviso`) ignoradas. Mesmo comportamento de `parseTicketListQuery`.
- `lib/users/list.ts` (puro): `USERS_PAGE_SIZE = 25`, `USERS_HREF = "/usuarios"`, `buildUsersHref(page)` (omite `page=1`), `lastPageFor(total)` (`max(1, ceil(total / 25))`) e `toUserRow(user, currentUserId)` → `{ id, name, email, role, createdAt, isSelf }`. O `id` vai ao navegador porque o formulário de mudança de papel precisa dele. O e-mail é dado da própria tela. Nada mais do objeto da API é serializado.
- `getPagination(total, page, limit)` de `lib/tickets/list.ts` já aceita `limit` e é reaproveitado com 25. A lista vazia não tem estado próprio: o próprio administrador sempre está nela. Se `data` vier vazio na página 1, a página mostra a mesma mensagem de "não tem usuários", sem ramo extra.
- 25 por página (e não 20 como os chamados) por decisão de produto: linhas de usuário são mais baixas e a lista é longa.

Alternativa descartada: buscar todas as páginas e paginar no servidor do Next. Custaria várias chamadas por renderização e não traria nada, porque não há filtro.

### 2. Paginação genérica

`TicketPagination` monta os links com `buildListHref(filters, page)`. Para não duplicar a marcação, a parte visual vai para `components/pagination/page-nav.tsx` (`PageNav({ page, pagination, hrefFor })`, Server Component), e `TicketPagination` passa a delegar a ele com `hrefFor = (p) => buildListHref(filters, p)`. `PageNav` só é renderizado por Server Components, então a função `hrefFor` nunca cruza a fronteira para o cliente. O E2E da lista de chamados cobre a regressão.

### 3. Uma marcação para card e linha

`components/users/user-table.tsx` segue `TicketTable`: `<ul>` em que cada `<li>` é um card abaixo de `md` e uma linha em grade (`Nome | E-mail | Papel | Cadastrado em | ação`) a partir de `md`, com cabeçalho `aria-hidden` e rótulos `sr-only` ("Papel:", "Cadastrado em"). Diferente dos chamados, a linha não é um link (não há detalhe de usuário), então a única ação interativa é o botão "Mudar papel". E-mail com `break-all` no card e `truncate` com `title` na grade, para nunca causar scroll horizontal. Papel em texto (`ROLE_LABELS`), sem chip colorido. A linha do próprio administrador (`isSelf`) mostra "Você" no lugar do botão.

Alternativa descartada: `<table>` semântica virando cards por CSS. Trocar o `display` dos elementos de tabela remove a semântica em alguns leitores de tela, e duas marcações (tabela e cards) duplicariam o conteúdo.

### 4. Mudança de papel: um diálogo, um estado

```
RoleChangeProvider ('use client')
  useActionState(changeRoleAction)          -> { notice?, error?, gone?, at }
  target: { id, name, role } | null         (linha escolhida)
  <p role="status" aria-live="polite">      sempre montado: "Papel alterado." / 404
  {children}                                (lista renderizada no servidor)
  <AlertDialog open={target !== null}>
     <form action={formAction}>
       hidden userId, <select name="role"> com rolesOfferedFor(target.role)
       aviso de rebaixamento se isDemotionToCustomer(target.role, escolhido)
       erro da acao (role="alert") quando o dialogo segue aberto
       Cancelar | Mudar papel ("Alterando..." via useFormStatus)

RoleChangeButton ('use client', em cada linha) -> context.open({ id, name, role })
```

- **Por que um provider:** a lista continua renderizada no servidor e cada linha só leva um botão cliente pequeno. Um único diálogo e um único `useActionState` garantem que a mensagem "Papel alterado." sobreviva ao `refresh()` e ao fechamento do diálogo, como em `TicketActions`.
- **Formulário dentro do diálogo:** diferente de `CloseTicketButton`, o `<select>` faz parte da confirmação, então o `<form>` inteiro fica no conteúdo do diálogo (o portal não atrapalha, porque nenhum campo fica fora dele).
- **Fechar só no sucesso e no 404:** o estado devolvido pela action tem um carimbo (`at`). Um `useEffect` no provider fecha o diálogo quando chega um estado novo com `notice` ou `gone`. Nos demais erros, o diálogo continua aberto com a escolha feita e o erro dentro dele. Ao fechar, o foco volta ao botão da linha (comportamento do `AlertDialog`; conferir no E2E com Esc).
- **Papéis oferecidos:** `lib/users/roles.ts` (puro): `rolesOfferedFor(current)` devolve os dois papéis diferentes do atual, na ordem Cliente, Atendente, Administrador. `isDemotionToCustomer(current, next)` é `current !== "CUSTOMER" && next === "CUSTOMER"`. O `<select>` começa com "Selecione o novo papel" vazio.
- **Server Action `changeRoleAction`** em `app/(app)/usuarios/actions.ts`:
  1. `changeRoleSchema` (`userId` UUID, `role` no enum `Role`). Inválido → `{ error: "Verifique os dados informados." }`, sem chamar a API. `role` vazio → `{ error: "Selecione o novo papel." }`.
  2. `withSession((token) => changeUserRole(token, userId, role))`, novo em `lib/api/users.ts` (`PATCH /users/{id}/role`).
  3. Sucesso → `refresh()` e `{ notice: "Papel alterado." }`.
  4. 404 → `refresh()` e `{ gone: true, error: "Este usuário não foi encontrado. A lista foi atualizada." }`. Diferente do detalhe do chamado, o `refresh()` é seguro aqui: a página da lista continua existindo.
  5. 422 → `toUserMessage`, com "Não é permitido alterar o próprio papel" adicionado a `KNOWN_MESSAGES` em `lib/api/errors.ts` (o texto já vem em pt-BR; ganha o ponto final). Outros 422 caem em "Não foi possível concluir a ação.".
  6. 403, 400, rede e 5xx → `toUserMessage`.
- **Sem checagem do próprio papel na action:** a API é a autoridade (422), e a UI já não oferece a ação. O mesmo papel enviado por um formulário forjado é aceito pela API sem efeito e mostra "Papel alterado.", o que é inofensivo.

### 5. Cadastro de equipe em página própria

`app/(app)/usuarios/novo/page.tsx` repete `/chamados/novo`: `requireRole("ADMIN")` dentro do `Suspense`, com o título também dentro, para o HTML estático não revelar a página. Não há dado a carregar, então o formulário entra direto. O texto de apoio diz que clientes criam a própria conta pelo cadastro público.

- **`createStaffSchema`** em `lib/validation/users.ts`: mesmas regras e mensagens do `signupSchema` para nome, e-mail (trim, minúsculas, até 200, formato) e senha (8 a 128), reaproveitando `AUTH_MESSAGES` quando o texto serve. As mensagens de campo vazio mudam de pessoa, porque o administrador preenche para outra pessoa ("Informe o nome.", "Informe o e-mail.", "Defina uma senha."). `role` em `z.enum(["SUPPORT", "ADMIN"])` com "Selecione o papel.". Sem "Confirmar senha": o administrador define uma senha inicial para outra pessoa, e a confirmação não está entre os campos decididos.
- **`createStaffAction`** em `app/(app)/usuarios/novo/actions.ts`:
  1. `readFormFields(formData, ["name","email","password","role"])`. `values` leva só `name`, `email` e `role`.
  2. Schema. Erro → `fieldErrors` + `values`, sem chamar a API.
  3. `withSession((token) => createStaff(token, data))`, novo em `lib/api/users.ts` (`POST /users/staff`).
  4. 409 → `fieldErrors.email = "Este e-mail já está cadastrado."`. A constante sai de `app/(auth)/cadastro/actions.ts` para `AUTH_MESSAGES.emailTaken`, e o cadastro passa a usá-la. 400 → `issuesToFieldErrors` com o mapa dos quatro campos, ou "Verifique os dados informados.". Demais → `toUserMessage`.
  5. Sucesso → lê o total com `withSession((token) => listUsers(token, { page: 1, limit: 1 }))` (o `total` não depende do `limit`, e `limit: 1` minimiza a resposta) e calcula `lastPageFor(total)`. Se essa leitura falhar, usa a página 1. Depois, `redirect(withUserNotice(buildUsersHref(page), "usuario-cadastrado"))`, fora do `try/catch`. O usuário já foi criado: nenhuma falha depois do 201 tenta criar de novo.
- **Senha não preservada:** `FormState` já é documentado como "nunca contém senhas", e o cadastro público faz o mesmo. Devolver a senha poria o texto no payload RSC e no HTML. O custo é redigitar a senha depois de um erro, e o campo traz a ajuda "Entre 8 e 128 caracteres.".
- **Formulário:** `NewStaffForm` (`'use client'`) com `FormField` (nome, e-mail com `type="email"`, `autoCapitalize="none"`, senha com `type="password"` e `autoComplete="new-password"`), `SelectField` (papel com "Selecione o papel"), `SubmitButton` ("Cadastrar usuário" / "Cadastrando...") e `FormAlert`. O `<select>` recebe `key` pelo valor preservado, pela mesma correção feita em `new-ticket-form.tsx`.

Alternativa descartada para o destino: voltar para a página 1. Com a ordem da API (mais antigos primeiro), o usuário novo nunca estaria lá. A API não permite inverter a ordem.

### 6. Avisos por código fechado

`lib/users/notices.ts` repete `lib/tickets/notices.ts`: `USER_NOTICES = { "usuario-cadastrado": "Usuário cadastrado." }`, `getUserNotice(code)` (com `Object.hasOwn`, primeiro valor se repetido) e `withUserNotice(href, code)`. `/usuarios` exibe o aviso com `FormAlert tone="info"` (`role="status"`) acima da lista. `aviso` não entra em `buildUsersHref`, então some ao paginar.

### 7. Breadcrumb de três níveis

`lib/navigation/config.ts` ganha `SUBPAGES = { "/usuarios/novo": { parent: "/usuarios", label: "Novo usuário" } }`. `pageTitleFor` devolve o rótulo da subpágina, e `breadcrumbFor` monta `Painel (link) / {pai} (link) / {subpágina}`. O rótulo do pai vem do item de navegação, então "Usuários" não é repetido. `Breadcrumbs` já renderiza qualquer número de níveis e esconde no mobile tudo menos o último. As demais rotas não mudam: `/chamados/novo` continua "Painel / Abrir chamado" e `/chamados/{id}` continua "Painel / Chamado". Alinhar essas rotas ao novo formato muda a spec delas e fica fora desta change. Para os papéis vetados, `canAccess` continua devolvendo "Painel / Página não encontrada" antes de qualquer subpágina.

### 8. Fim das páginas em construção

Com `/categorias` construída por `add-category-admin` e `/usuarios` por esta change, `ComingSoon` e `ComingSoonSkeleton` (`components/app-shell/coming-soon.tsx`) ficam sem uso e são removidos. O requisito "Páginas em construção" sai da spec `app-shell`. O caso `/chamados/abc` já está no requisito "Chamado não encontrado" de `ticket-detail` e no E2E "identificador de chamado inválido" de `e2e/role-access.spec.ts`, que continua igual.

### 9. Sessão e refresh

Nenhuma regra nova. Server Components (`/usuarios`, `/usuarios/novo`) nunca renovam tokens: `requireRole` e `loadPanel` levam ao login em 401. As duas Server Actions usam `withSession`, que faz o refresh reativo uma vez, com single-flight, e repete a requisição uma vez. Se o refresh falhar, apaga os cookies e leva ao login com "Sua sessão expirou. Entre novamente.".

### 10. Testes

- **Vitest:** `createStaffSchema` (nome 1/2/100/101 depois do trim, e-mail com 200/201 caracteres, normalização, senha 7/8/128/129, `role` vazio, `CUSTOMER` e minúsculo), `parseUserListQuery`, `changeRoleSchema`, `buildUsersHref`, `lastPageFor` (0, 1, 25, 26, 490), `toUserRow` (`isSelf`, só os campos do DTO), `rolesOfferedFor`, `isDemotionToCustomer`, `getUserNotice`, `breadcrumbFor`/`pageTitleFor` com `/usuarios/novo`, `createStaff` e `changeUserRole` em `lib/api/__tests__/endpoints.test.ts`. As duas actions com a API mockada e o `withSession` real, como em `chamados/novo/actions.test.ts`.
- **Playwright** contra a API real, desktop e mobile, logado com o ADMIN fixo:
  - Usuários criados pelos testes são descartáveis: `createDisposableUser` ou o próprio formulário, com `uniqueEmail`. A API não exclui usuários, então cada teste cria só o que usa.
  - **Os usuários fixos nunca têm o papel alterado.** O E2E muda papel só de usuários descartáveis.
  - O formulário só cadastra **atendentes** nos testes. A opção "Administrador" é conferida, mas não enviada, para não deixar administradores extras no banco compartilhado. Os atendentes criados usam senha aleatória por teste, não a constante `PASSWORD` de `e2e/support.ts`.
  - Para achar a página de um usuário, um helper novo `findUserPage(email)` percorre `GET /users` com o token do ADMIN fixo (100 por página) e devolve `floor(índice / 25) + 1`. Nenhum teste depende de totais exatos.
  - O 404 da mudança de papel não pode ser provocado no E2E (a API não exclui usuários). Ele fica coberto pelo Vitest da action.

## Risks / Trade-offs

- **[Limitação]** O papel vai dentro do access token (JWT). Depois da mudança, o usuário afetado mantém as permissões antigas até o access token ser substituído (até 15 min). A referência da API diz que a mudança revoga as sessões e que o novo papel vale no próximo login. A moldura já é montada a partir de `GET /users/me` a cada página, então mostra o papel novo assim que a API o aplicar. O frontend não tem como encurtar essa janela. → Mitigação: só documentação (aqui e no proposal). Um aviso no diálogo mudaria a spec e não foi pedido.
- **[Risco]** Rebaixar um atendente deixa chamados `IN_PROGRESS` atribuídos a um `CUSTOMER`, que perde o acesso a eles. → Mitigação: aviso no diálogo e reatribuição pelo detalhe do chamado (`ticket-detail`, "Reatribuir"), que só oferece usuários `SUPPORT`.
- **[Risco]** A última página é calculada pelo total lido logo depois do cadastro. Se outro administrador cadastrar alguém nesse intervalo e o total cruzar um múltiplo de 25, o usuário novo fica na penúltima página. → Mitigação: aceito. A janela é de milissegundos, há poucos administradores, e o aviso "Usuário cadastrado." aparece mesmo assim.
- **[Trade-off]** Uma requisição a mais (`GET /users?limit=1`) depois de cada cadastro, em troca de mostrar o usuário novo.
- **[Trade-off]** Depois de um cadastro, a URL continua com `aviso=usuario-cadastrado` até o administrador paginar. Uma mudança de papel nessa mesma tela mostra "Papel alterado." junto do aviso anterior. → Aceito: as duas mensagens são verdadeiras e somem ao navegar.
- **[Risco]** A lista cresce com os usuários dos E2E (cerca de 490 hoje, 20 páginas). → Mitigação: a paginação não depende do total, e os testes acham a página do usuário pela API.
- **[Risco]** `add-category-admin` também pode alterar "Top bar com localização" ou "Páginas em construção". → Mitigação: arquivar `add-category-admin` antes. Se ela alterar o requisito do top bar, o bloco MODIFIED desta change é refeito sobre o texto já arquivado antes de arquivar esta.

## Migration Plan

Sem migração de dados. Ordem de arquivamento: `add-category-admin` → `add-user-admin`. Rollback: reverter o commit volta `/usuarios` ao `ComingSoon`. Os usuários criados ou alterados pelo uso real não são afetados.
