# Proposal

## Why

O cliente já tem o botão "Abrir chamado" na sidebar e no painel, mas `/chamados/novo` ainda é uma página "Em breve". Sem esse formulário, nenhum chamado nasce pelo frontend e a lista (`add-ticket-list`) só mostra chamados criados por outros meios. Esta é a segunda de três changes sobre chamados.

## What Changes

- **Formulário "Abrir chamado" em `/chamados/novo`**, exclusivo do `CUSTOMER` (o acesso por papel já existe): título, descrição, prioridade e categoria.
- **Categorias** vêm de `GET /categories`, que para o cliente já devolve só as ativas, em ordem alfabética.
- **Validação em pt-BR** espelhando a API (título de 5 a 120 caracteres, descrição de 10 a 5000, prioridade e categoria obrigatórias), no servidor e no cliente.
- **Envio por Server Action** (`POST /tickets`), com envio único e os valores preservados em caso de erro.
- **Depois de abrir**, o cliente vai para `/chamados` e vê o aviso "Chamado aberto.", com o chamado novo no topo da lista. O destino muda para o detalhe do chamado em `add-ticket-detail`.
- **Casos de borda:** nenhuma categoria ativa, falha ao carregar as categorias, categoria desativada entre abrir o formulário e enviar (422) e demais erros da API.
- `/chamados/novo` deixa de ser página "em construção".

## Capabilities

### New Capabilities

- `ticket-create`: abertura de chamado pelo cliente, com o formulário, as validações, o envio, a confirmação e o tratamento de erros.

### Modified Capabilities

- `app-shell`: o requisito "Páginas em construção" deixa de incluir `/chamados/novo`.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (Server Actions com `useActionState`, refresh reativo em Server Action, zod com mensagens pt-BR, mapeamento de erros e responsividade) e `docs/api-reference.md`, seções "Tickets/Criação", "Regras de categorias", "Validações de formulário" (`title`, `description`, `priority`, `categoryId`) e "Erros" (400, 401, 403, 422).
- **Endpoints da API:** `GET /categories` (leitura) e `POST /tickets` (mutação).
- **Código:** `app/(app)/chamados/novo/` ganha `page.tsx` real, `actions.ts` e o formulário client. Novo `createTicketSchema` em `lib/validation/tickets.ts`, `createTicket` em `lib/api/tickets.ts`, tipo `CreateTicketState` e aviso `chamado-aberto` exibido em `/chamados`. Reaproveita `withSession`, `FormField`, `SubmitButton`, `FormAlert`, `toFieldErrors`, `parseValidationMessages` e os rótulos de prioridade.
- **Dependências:** depende de `add-ticket-list`, que traz a página `/chamados` onde o aviso aparece e o `lib/validation/tickets.ts`. Arquivar depois dela e antes de `add-ticket-detail`.
- **Testes:** Vitest para o schema e a Server Action, com a API mockada. Playwright contra a API real (desktop e mobile) com o cliente fixo e títulos com prefixo único.
