# Design

## Context

`/chamados/novo` já exige `CUSTOMER` (`requireRole("CUSTOMER")` responde "não encontrado" aos demais) e mostra `ComingSoon`. O projeto já tem o padrão de formulário com Server Action + `useActionState` no cadastro (`app/(auth)/cadastro/actions.ts`): `readFormFields` → schema zod → chamada à API → `FormState` com `fieldErrors`, `formError` e `values`, e 400 traduzido por `parseValidationMessages` + `issuesToFieldErrors`. Para mutações autenticadas existe `withSession` (`lib/auth/session-action.ts`), que verifica a sessão e faz o refresh reativo uma vez, com single-flight. `add-ticket-list` traz `lib/validation/tickets.ts` com os enums e a página `/chamados`.

## Goals / Non-Goals

**Goals:**
- O mesmo padrão de formulário do cadastro, sem abstrações novas.
- Nenhum valor digitado é perdido em erro.

**Non-Goals:**
- Funcionar com o JavaScript desabilitado: com `cacheComponents`, as páginas autenticadas dependem de script para revelar o conteúdo em streaming (ver `add-ticket-list`, design.md).
- Anexos, rascunho salvo e pré-visualização: a API não oferece.
- Contador de caracteres ao vivo: os limites aparecem como texto de ajuda fixo.
- Levar ao detalhe do chamado criado: entra em `add-ticket-detail`.

## Decisions

### 1. Leitura das categorias no Server Component

```
/chamados/novo (Server Component, dentro de <Suspense>)
  requireRole("CUSTOMER")             -> notFound() para a equipe, sem tocar em /categories
  getAccessToken()
  loadPanel(() => listCategories(token))
     ok, []     -> <NoCategories />          ("Ainda nao ha categorias disponiveis...")
     ok, [..]   -> <NewTicketForm categories={[{id,name}]} />   (DTO: so id e nome)
     !ok        -> <FormLoadError />          ("Nao foi possivel carregar o formulario.")
                   (401 ja virou redirect para /login)
```

`loadPanel` é reaproveitado como está. O nome continua de "painel", mas a semântica (401 vira login, o resto vira falha exibível) é a mesma. Renomear fica para quando houver um terceiro uso fora do dashboard, para não misturar refatoração nesta change.

### 2. Server Action `createTicketAction`

Em `app/(app)/chamados/novo/actions.ts`, seguindo o padrão do cadastro:

1. `readFormFields(formData, ["title","description","priority","categoryId"])`. Os valores brutos voltam em `values` em qualquer erro.
2. `createTicketSchema.safeParse(raw)`, com `trim` em título e descrição, `title` de 5 a 120, `description` de 10 a 5000, `priority` no enum e `categoryId` como `z.uuid()`. Mensagens pt-BR explícitas em cada regra.
3. `withSession((token) => createTicket(token, data))`, com `createTicket` novo em `lib/api/tickets.ts` (`POST /tickets`).
4. Erros:
   - 422 → `fieldErrors.categoryId = "Esta categoria não está mais disponível. Escolha outra."`, `values.categoryId = ""` e `refresh()` (`next/cache`), para o Server Component buscar de novo as categorias e a desativada sumir das opções.
   - 400 → `issuesToFieldErrors` com o mapa `API_FIELD_MESSAGES` dos quatro campos. Se nenhum campo for reconhecido, `formError: MESSAGES.invalidData`.
   - Demais erros → `formError: toUserMessage(error)` (403, rede e 5xx).
5. Sucesso → `redirect("/chamados?aviso=chamado-aberto")`, fora do `try/catch`.

A Server Action não confere o papel antes de chamar a API. A API é a autoridade, devolve 403 a quem não é `CUSTOMER`, e esse 403 já tem mensagem. `withSession` garante que existe sessão antes da chamada.

### 3. Aviso na lista por código fechado

`lib/tickets/notices.ts` define `LIST_NOTICES = { "chamado-aberto": "Chamado aberto." }` e `getListNotice(code)`, no mesmo padrão de `lib/auth/notices.ts`: só códigos conhecidos e nenhum texto da URL renderizado. `/chamados` lê `aviso` dos `searchParams` e exibe `FormAlert` com `role="status"` acima dos filtros. O parâmetro `aviso` é ignorado por `ticketListQuerySchema` e não entra em `buildListHref`, então desaparece ao filtrar ou paginar.

Alternativa descartada: cookie flash. Exigiria gravar e apagar cookie e não funciona em Server Component sem um Route Handler. O código na URL é mais simples e já é o padrão do projeto.

### 4. Componentes do formulário

`NewTicketForm` (`'use client'`) usa `useActionState(createTicketAction, {})` e reaproveita `FormField` (título), `SubmitButton` ("Abrir chamado" / "Abrindo...") e `FormAlert`. Faltam dois componentes no mesmo estilo de `FormField`, criados em `components/forms/`: `TextareaField` (descrição, 6 linhas, `resize-y`) e `SelectField` (`<select>` nativo, pela usabilidade no mobile e pelo acesso por teclado e leitor de tela sem componente extra). Ambos ligam a mensagem de erro ao campo com `aria-describedby` e `aria-invalid`, como o `FormField`. O `defaultValue` de cada campo vem de `state.values`, com prioridade `MEDIUM` como padrão.

A validação no cliente é opcional pelas diretrizes e fica restrita aos atributos nativos (`required`, `minLength`, `maxLength`), sem duplicar o zod no navegador. Os limites aparecem como ajuda abaixo do campo ("Entre 5 e 120 caracteres.").

### 5. Testes

- **Vitest:** `createTicketSchema` (limites com e sem espaços, enum, UUID, mensagens) e `createTicketAction` com `createTicket`/`withSession` mockados: validação sem chamar a API, 400 mapeado para os campos, 422 com `refresh` chamado e `categoryId` limpo, 403, rede, valores preservados e sucesso redirecionando para `/chamados?aviso=chamado-aberto`. Também `getListNotice` (código conhecido e desconhecido).
- **Playwright** (`e2e/ticket-create.spec.ts`, desktop e mobile, cliente fixo): erros de validação exibidos sem criar chamado, criação com título `[e2e-<timestamp>] ...` chegando a `/chamados` com "Chamado aberto." e o chamado no topo, "Cancelar" voltando à lista e equipe recebendo "não encontrado". O 422 de categoria desativada é coberto com o admin fixo: ele cria uma categoria descartável, o cliente abre o formulário, o admin desativa a categoria pela API e o cliente envia. A categoria fica desativada ao final.

## Risks / Trade-offs

- **[Risco]** `refresh()` dentro de uma Server Action que também devolve estado pode não manter o estado do `useActionState`. → Mitigação: ler `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md` e o guia de Server Actions antes de implementar e verificar no E2E do 422. Se o estado se perder, trocar por `redirect` para `/chamados/novo?aviso=categoria-indisponivel` com os valores no `useActionState` do cliente, e registrar como `> Impeditivo:` na task.
- **[Trade-off]** Depois de criar, o cliente vai para a lista, não para o chamado. É temporário: `add-ticket-detail` muda o destino.
- **[Risco]** O E2E do 422 depende de o admin fixo criar e desativar categorias no banco compartilhado. → Mitigação: nome único com prefixo, categoria desativada ao final e nenhuma dependência de quantas categorias existem.
