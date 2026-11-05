# Proposal

## Why

O administrador já vê "Categorias" no grupo "Administração" e o link "Gerenciar categorias" no painel, mas `/categorias` ainda é uma página "Em breve". Hoje não há como criar, renomear ou desativar categorias pelo frontend, e são elas que o cliente escolhe ao abrir um chamado. Uma categoria que deixou de fazer sentido continua aparecendo no formulário dos clientes até alguém mexer direto na API.

## What Changes

- **Administração de categorias em `/categorias`**, exclusiva do `ADMIN` (o bloqueio por papel já existe e continua respondendo "não encontrado" aos demais).
- **Lista única com todas as categorias**, ativas e inativas, na ordem da API (por nome). A API não pagina, e hoje são cerca de 20. Cada item mostra o nome, o estado "Ativa" ou "Inativa" (texto + cor) e as ações "Renomear" e "Desativar" ou "Ativar".
- **Não é um CRUD:** a API não exclui categorias. Desativar substitui a exclusão, e a tela nunca oferece "Excluir".
- **Criar e renomear num diálogo** com um único campo "Nome" (2 a 60 caracteres, validado em pt-BR no servidor). Nome duplicado (409) vira erro no campo: "Já existe uma categoria com esse nome.". A unicidade é da API, que diferencia maiúsculas de minúsculas. O frontend não bloqueia por conta própria.
- **Ativar e desativar sem confirmação**, porque é reversível. A página explica que uma categoria inativa some da abertura de chamados e que os chamados que já a usam continuam com ela.
- **Retorno de cada ação** anunciado a leitores de tela ("Categoria criada.", "Categoria renomeada.", "Categoria desativada.", "Categoria ativada."), com a lista relida da API.
- **Casos de borda:** lista vazia, falha ao carregar com "Tentar novamente", categoria que não existe mais (404, a lista é recarregada com explicação), envio único, valor digitado preservado em erro e demais erros da API mapeados para pt-BR.
- **Responsivo e acessível:** sem scroll horizontal em 360px, alvos de 44px, temas claro e escuro, e o foco volta ao botão que abriu o diálogo.
- `/categorias` deixa de ser página "em construção".

## Capabilities

### New Capabilities

- `category-admin`: administração das categorias de chamado pelo administrador, com a lista completa, a criação, a renomeação, a ativação e a desativação, as validações, as mensagens e o tratamento de erros.

### Modified Capabilities

- `app-shell`: o requisito "Páginas em construção" deixa de incluir `/categorias` e passa a citar só `/usuarios`.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (Server Component para leitura, Server Actions com `useActionState` e refresh reativo para mutações, zod com mensagens pt-BR, mapeamento de 400/401/403/404/409, testes Vitest e Playwright contra a API real, isolamento de dados de teste e responsividade) e `docs/api-reference.md`, seções "Categories", "Regras de categorias" (ADMIN recebe todas com `active`, não existe exclusão, `PATCH` exige `name` e/ou `active`, nome único), "Validações de formulário" (`name` de 2 a 60) e "Erros".
- **Endpoints da API:** `GET /categories` (leitura), `POST /categories` e `PATCH /categories/{id}` (mutações).
- **Código:** `app/(app)/categorias/` ganha `page.tsx` real e `actions.ts`. Novos `createCategory` e `updateCategory` em `lib/api/categories.ts`, DTOs em `lib/api/types.ts`, schema em `lib/validation/categories.ts`, estado e mensagens em `lib/categories/`, componentes em `components/categories/` e o componente shadcn `dialog`. Reaproveita `requireRole`, `loadPanel`, `withSession`, `FormField`, `SubmitButton`, `FormAlert`, `PanelError` e o chip de status.
- **Coordenação:** arquivar antes de `add-user-admin`, que remove `/usuarios` do mesmo requisito "Páginas em construção".
- **Efeito em outras telas:** só indireto. Uma categoria desativada some do select de `/chamados/novo` (`ticket-create`), comportamento que já existe e não muda.
- **Testes:** Vitest para o schema, os clientes da API, as Server Actions e o diálogo. Playwright contra a API real (desktop e mobile) com o admin fixo, nomes com prefixo único e todas as categorias de teste deixadas inativas ao final.
