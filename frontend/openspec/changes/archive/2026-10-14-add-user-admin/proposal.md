# Proposal

## Why

O administrador já vê "Usuários" no grupo "Administração" da sidebar, mas `/usuarios` ainda é uma página "Em breve". Sem ela, a única forma de criar atendentes e administradores ou de mudar o papel de alguém é chamar a API diretamente, e a atribuição de chamados (`ticket-detail`) depende de existirem usuários `SUPPORT`. Esta é a última página "em construção" do app.

## What Changes

- **Administração de usuários, não CRUD.** A API só permite listar usuários, cadastrar equipe (`SUPPORT`/`ADMIN`) e mudar o papel. Ela não edita nome, e-mail ou senha nem exclui ou desativa usuários, e a UI não oferece essas ações. Clientes continuam se cadastrando pela página pública `/cadastro`.
- **Lista em `/usuarios`**, exclusiva do `ADMIN`: nome, e-mail, papel em texto ("Cliente", "Atendente", "Administrador") e data de cadastro, na ordem da API (mais antigos primeiro). Paginação de 25 por página com a página na URL, no mesmo padrão de `/chamados` (parâmetro inválido descartado, página além do total com mensagem e link para a primeira). Cards no mobile e linhas em grade no desktop.
- **Sem busca e sem filtro.** `GET /users` não oferece busca, filtro por papel nem ordenação. Filtrar no navegador só filtraria a página atual, o que seria enganoso.
- **Cadastro de equipe em `/usuarios/novo`**, página própria no padrão de `/chamados/novo`: nome, e-mail, senha e papel (Atendente ou Administrador). Validação zod em pt-BR espelhando a API, a senha nunca volta ao navegador depois de um erro, 409 vira "Este e-mail já está cadastrado." no campo e o envio é único. Depois do cadastro, o administrador vai para a **última página** da lista, onde o usuário novo aparece, com o aviso "Usuário cadastrado.".
- **Mudar papel** por um diálogo na linha do usuário: escolha entre os outros dois papéis e confirmação. A linha do próprio administrador não tem a ação (a API responde 422). Ao rebaixar um atendente ou administrador para cliente, o diálogo avisa que os chamados atribuídos a essa pessoa continuam atribuídos e devem ser reatribuídos pelo detalhe do chamado. O resultado ("Papel alterado.") é anunciado a leitores de tela, e 404, 422 e os demais erros têm mensagens pt-BR.
- **Breadcrumb com três níveis** em `/usuarios/novo`: "Painel / Usuários / Novo usuário".
- **BREAKING (spec):** o requisito "Páginas em construção" da `app-shell` é removido, porque nenhuma página continua em construção. O caso do identificador de chamado inválido já é coberto por "Chamado não encontrado" em `ticket-detail`.
- **Limitação conhecida:** o papel vai dentro do access token (JWT). O usuário afetado mantém as permissões antigas até o access token dele ser substituído (até 15 min). Depois disso a API já aplica o novo papel, e a moldura, que é montada a partir de `GET /users/me`, também. O frontend não tem como encurtar essa janela.

## Capabilities

### New Capabilities

- `user-admin`: administração de usuários pelo `ADMIN`: lista paginada, cadastro de atendentes e administradores e mudança de papel, com validações, confirmações e tratamento de erros.

### Modified Capabilities

- `app-shell`: remove o requisito "Páginas em construção" e altera "Top bar com localização" para aceitar o breadcrumb de três níveis de `/usuarios/novo`.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (BFF server-first, Server Actions com `useActionState`, refresh reativo em Server Action, zod com mensagens pt-BR, mapeamento de erros 400/401/403/404/409/422, testes Vitest e Playwright, responsividade e convenção de tasks) e `docs/api-reference.md`, seções "Users", "Papéis e permissões", "Paginação" (máx. 100 em `GET /users`), "Validações de formulário" (`name`, `email`, `password`, `role` de staff), "Autenticação e sessão" (mudança de papel revoga sessões) e "Erros". Visual conforme `components/ui/references/design-system.md`.
- **Endpoints da API:** `GET /users` (leitura), `POST /users/staff` e `PATCH /users/{id}/role` (mutações), todos exclusivos de `ADMIN`.
- **Código:** `app/(app)/usuarios/page.tsx` deixa de usar `ComingSoon`; novos `app/(app)/usuarios/actions.ts`, `app/(app)/usuarios/novo/` (página, formulário e Server Action), componentes em `components/users/`, helpers puros em `lib/users/`, schemas em `lib/validation/users.ts`, `createStaff` e `changeUserRole` em `lib/api/users.ts` e o breadcrumb de três níveis em `lib/navigation/config.ts`. `ComingSoon` fica sem uso e é removido.
- **Ordem de arquivamento:** depende de `add-category-admin`, que tira `/categorias` de "Páginas em construção". Esta change parte do estado deixado por ela (o requisito listando só `/usuarios`) e remove o requisito inteiro. Arquivar `add-category-admin` antes desta. Se `add-category-admin` também alterar "Top bar com localização", o delta desta change precisa ser refeito sobre o texto já arquivado.
- **Testes:** Vitest para os schemas, os helpers de paginação e de URL, a regra de papéis oferecidos e as duas Server Actions (API mockada). Playwright contra a API real (desktop e mobile) com usuários descartáveis de e-mail único. Os usuários fixos nunca têm o papel alterado.
