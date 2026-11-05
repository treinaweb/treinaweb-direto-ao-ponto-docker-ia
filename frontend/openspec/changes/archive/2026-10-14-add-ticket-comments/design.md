# Design

## Context

`/chamados/[id]/page.tsx` já carrega o chamado num Server Component dentro de `<Suspense>` (`loadTicket`), calcula as ações com a regra pura `getTicketActions(ticket, viewer)` e isola a lista de atendentes do ADMIN num `Suspense` próprio (`AssigneePicker`, que lê o token por conta própria e usa `loadPanel`). As mutações usam Server Actions com `withSession` (refresh reativo, single-flight) e `refresh()` de `next/cache`. `TicketActions` fica sempre montado para que a mensagem de resultado sobreviva ao `refresh()`. `getCustomerNotice` (`lib/tickets/actions.ts`) devolve o texto "… Em breve você poderá responder por aqui.". A descrição usa `whitespace-pre-wrap` e `break-words` (`TicketDescription`), e `formatDateTime` (`lib/format.ts`) já formata em horário de Brasília.

A API (`docs/api-reference.md`, "Comments" e "Regras de comentários"), conferida com sondas reais em outubro de 2026:

- `GET /tickets/{id}/comments?page&limit` (máx. 100) devolve `{ data, page, limit, total }`, do mais antigo para o mais recente. Cada item: `{ id, body, isInternal, createdAt, author: { id, name, role } }`. Para o `CUSTOMER`, as notas internas não vêm e não contam no `total`. O `SUPPORT` não atribuído consegue ler a conversa de um chamado da fila (200).
- `POST /tickets/{id}/comments` com `{ body, isInternal? }` → 201. `SUPPORT` não atribuído → 422 "Apenas o atendente atribuído pode comentar neste ticket". Chamado `CLOSED` → 422 "Ticket fechado não aceita comentários". `CUSTOMER` com `isInternal: true` → 403 "Apenas a equipe pode criar notas internas". `body` só com espaços → 400 `["body should not be empty"]` (class-validator, em inglês). `ADMIN` num chamado `OPEN` da fila → 201. Cliente em `WAITING_CUSTOMER` → 201 e o chamado vai para `IN_PROGRESS`. Cliente em `RESOLVED` → 201 e o chamado continua `RESOLVED`. 409 se o status mudar no meio da retomada automática.

## Goals / Non-Goals

**Goals:**
- Uma regra pura decide se o campo aparece, e qual texto o substitui, testável em todas as combinações de papel, relação e status, no mesmo estilo de `getTicketActions`.
- A conversa inteira é lida no servidor, com teto explícito e honesto, sem paginação na tela.
- A falha da conversa fica restrita à seção "Comentários".
- Depois de comentar, a página mostra o estado real relido da API (status, avisos, ações e conversa).

**Non-Goals:**
- Editar ou apagar comentários: a API não oferece.
- Atualização em tempo real (polling) da conversa. Como no detalhe, toda ação relê o estado.
- Rascunho persistido entre recargas da página.
- Contagem de comentários na lista de chamados ou no dashboard.

## Decisions

### 1. Camada de API: `lib/api/comments.ts`

Tipos `Comment` e `CreateCommentDto` em `lib/api/types.ts`. Em `lib/api/comments.ts` (`import 'server-only'`):

- `listComments(token, ticketId, { page, limit })` → `GET /tickets/{id}/comments?page&limit`, com `encodeURIComponent` no id.
- `createComment(token, ticketId, { body, isInternal })` → `POST /tickets/{id}/comments`. O `isInternal` só vai no corpo quando for `true`. A resposta da cliente nunca leva o campo, e assim o 403 de nota interna não pode ser provocado por engano.

### 2. Conversa inteira com teto de 20 páginas

`listTicketComments(token, ticketId)` reaproveita o padrão de `listSupportAgents` (`lib/api/users.ts`): 100 por página, teto `COMMENTS_MAX_PAGES = 20` (2.000 comentários), envolvida em `cache` do React e com DTO enxuto.

```
pagina 1 (limit 100)          -> total, data
totalPages = ceil(total / 100)
se totalPages <= 20:  paginas 2..totalPages, em sequencia
se totalPages  > 20:  firstPage = floor((total - 2000) / 100) + 1
                      le firstPage..totalPages (reaproveita a pagina 1 so se firstPage = 1)
                      e fica com os ultimos 2.000 -> truncated = true
para cedo se uma pagina vier vazia; remove ids repetidos (comentario novo entre as leituras desloca as paginas)
devolve { comments: ThreadComment[], total, truncated }
ThreadComment = { id, body, isInternal, createdAt, authorName, authorIsStaff }
```

Ao bater no teto, a tela mostra os mais recentes, e não os mais antigos, porque o fim da conversa é o que importa para responder. O aviso "Esta conversa tem {total} comentários. Exibindo os 2.000 mais recentes." (com `formatNumber`) deixa claro que há mais. Na prática o teto não deve ser atingido. As leituras são sequenciais, como em `listSupportAgents`, para não disparar 20 requisições simultâneas numa API de terceiros.

Alternativas descartadas: paginação na tela, já que a decisão com o usuário foi carregar a conversa inteira; e mostrar os 2.000 mais antigos, que esconderia justamente as mensagens recentes.

### 3. Quem pode comentar: regra pura

`getCommentAccess(ticket, viewer)` em `lib/tickets/comments.ts`, ao lado de `getTicketActions`:

```
type CommentAccess =
  | { kind: "composer"; canInternal: boolean }
  | { kind: "blocked"; reason: "closed" | "assume" }
  | { kind: "none" }

                  OPEN / IN_PROGRESS / WAITING_CUSTOMER / RESOLVED     CLOSED
CUSTOMER dono     composer (canInternal: false)                        blocked: closed
CUSTOMER outro    none (a API devolveria 404 no GET do chamado)        none
SUPPORT atribuido composer (canInternal: true)                         blocked: closed
SUPPORT outro     blocked: assume                                      blocked: closed
ADMIN             composer (canInternal: true)                         blocked: closed
```

Os textos ("Chamado fechado não aceita novos comentários.", "Assuma o chamado para responder."), os rótulos do campo e dos botões e as mensagens de sucesso e erro ficam em `lib/tickets/comment-labels.ts`, no estilo de `action-labels.ts`. A regra é calculada no servidor, e o Client Component recebe só `CommentAccess`, sem ids de usuário.

### 4. Composição da página

```
/chamados/[id] (Server Component, já existente)
  ticket, user, actions, customerNotice  (como hoje)
  access = getCommentAccess(ticket, user)
  coluna esquerda (mobile: depois das informações; lg: 8/12, row-span-2)
    <TicketDescription/>
    <section aria-labelledby="ticket-comments">  "Comentarios"
      <Suspense fallback={<CommentThreadSkeleton/>}>
        <CommentThread ticketId/>        Server Component: le o token, loadPanel(listTicketComments)
             ok    -> <ol> de <CommentItem/> | "Nenhum comentario ainda." | aviso de teto
             falha -> <PanelError message="Nao foi possivel carregar os comentarios."/>
             401   -> login (loadPanel)
      </Suspense>
      <CommentComposer ticketId access/>  Client Component, fora do Suspense da conversa
```

- `CommentThread` lê o token com `getAccessToken()`, nunca por props, como `AssigneePicker`. Como fica num `Suspense` próprio, a falha não afeta o restante do chamado, e a leitura não atrasa o cabeçalho, as ações e a descrição.
- O campo fica fora do `Suspense` da conversa porque depende só do chamado e do usuário, já carregados. Se a conversa falhar, ainda é possível comentar, e o `refresh()` do envio tenta a leitura de novo.
- 404 na leitura da conversa (o chamado sumiu entre as duas leituras) cai no estado de falha. A próxima recarga mostra "Chamado não encontrado." pelo `loadTicket`.
- O aviso de "Aguardando cliente" (`getCustomerNotice`) passa ao novo texto e ganha o botão "Responder" (`ReplyShortcut`, `'use client'`), que faz `scrollIntoView` e `focus()` no campo `field-body`. Um link `#field-body` sozinho rolaria a página sem garantir o foco no campo.
- Nenhum dado sai do navegador para a API: a leitura é do Server Component e o envio é Server Action (POST para o próprio Next).

### 5. Envio: Server Action `commentAction`

`commentAction(prev, formData)` em `app/(app)/chamados/[id]/comment-actions.ts`:

1. Lê `ticketId`, `body` e `isInternal` (caixa de seleção: `"on"` → `true`) e valida com `commentSchema` (`lib/validation/comments.ts`): `ticketId` UUID, `body` com `trim()`, `min(1, "Escreva um comentário.")` e `max(5000, "O comentário deve ter no máximo 5000 caracteres.")`, e `isInternal` booleano. Inválido → `{ fieldErrors, values }` sem chamar a API.
2. `withSession(token => createComment(token, ticketId, { body, isInternal }))`. A action não recalcula `getCommentAccess`: a API é a autoridade, e recalcular custaria um `GET` a mais.
3. Resultado:
   - 201 → `refresh()` e `{ notice: "Resposta enviada." | "Nota interna adicionada.", submission: n + 1 }`, sem `values`.
   - 422 → `refresh()` e `{ formError, values }`. A mensagem é escolhida pelo texto conhecido da API, num mapa local: "Ticket fechado não aceita comentários" → "Este chamado foi fechado e não aceita novos comentários."; "Apenas o atendente atribuído pode comentar neste ticket" → "Apenas o atendente atribuído pode comentar neste chamado."; qualquer outro → "Não é possível comentar na situação atual do chamado.". O texto da API nunca é exibido.
   - 409 → `refresh()` e `{ formError: "Este chamado foi alterado por outra pessoa. Confira a conversa e tente novamente.", values }`.
   - 404 → `{ gone: true }`, sem `refresh()` (re-renderizar trocaria a página por "não encontrado", como em `ticketAction`).
   - 400 → `parseValidationMessages` + `issuesToFieldErrors` com as mensagens pt-BR do `body` (`required` → "Escreva um comentário.", `maxLength` → limite). Sem campo identificado → "Verifique os dados informados.".
   - 403, rede, 5xx → `toUserMessage(error)`, com `values`.
   - 401 → tratado por `withSession` (renova uma vez e repete, ou leva ao login).

`CommentFormState` em `lib/tickets/form-state.ts` estende `FormState<"body", "body" | "isInternal">` com `notice`, `gone` e `submission`.

### 6. Campo de comentário: estado, envio único e foco

`CommentComposer` (`'use client'`) usa `useActionState(commentAction)` e fica **sempre montado** com o mesmo lugar na árvore, renderizando a mensagem de resultado e, conforme `access`, o formulário, o texto de bloqueio ou o estado `gone` com "Voltar aos chamados". Assim a mensagem de um 422 sobrevive ao `refresh()` mesmo quando o campo é trocado por "Chamado fechado não aceita novos comentários.". Nesse caso o texto digitado se perde, porque não há mais onde enviá-lo (ver Riscos).

- O React 19 reinicia os campos não controlados depois de cada action. Como em `NewTicketForm`, o `<textarea>` e a caixa de seleção usam `defaultValue`/`defaultChecked` vindos de `state.values` e `key` ligado a `state.submission` e aos valores. No erro, o texto e a opção voltam. No sucesso, os dois voltam vazios.
- `TextareaField` (`components/forms/textarea-field.tsx`) com `name="body"`, rótulo "Comentário", `maxLength={5000}`, ajuda "Até 5000 caracteres." e erro ligado por `aria-describedby`. A caixa de seleção nativa "Nota interna (visível só para a equipe)" só existe com `canInternal`, numa linha de `min-h-11`.
- O botão de envio (`SubmitButton`) mostra "Enviar resposta"/"Enviando..." ou, com a opção marcada, "Adicionar nota interna"/"Adicionando...". O rótulo segue a opção por um estado local espelhado do `checked`. O botão fica desabilitado com `isPending`, e o `<textarea>` fica `readOnly`, o que impede o segundo envio.
- Resultado em `FormAlert` (`role="status"` para sucesso e `role="alert"` para erro), mais a região `aria-live` com o texto de envio, como em `NewTicketForm`.
- Foco: um `useEffect` sobre `state` leva o foco ao `<textarea>` depois do sucesso e de erro de campo. Nos demais erros, o foco fica onde estava e a mensagem é anunciada.
- A validação no cliente é só o `maxLength` nativo. A validação zod fica no servidor (obrigatória, `docs/frontend-guidelines.md`, seção 4), e o retorno chega sem recarregar a página.

### 7. Visual

- Seção "Comentários": painel `rounded-panel bg-card` (`cloud`/`charcoal`), título `body-emphasis`, como a descrição.
- `CommentItem` (`<li>` com `<article>`): linha de metadados com o nome (`body-emphasis`), o selo em texto ("Equipe" em `primary-soft` com texto `ink`; "Cliente" em `fog`/`charcoal`) e `<time dateTime={createdAt}>` com `formatDateTime` em `caption-sm` `graphite`. O texto em `body-md`, `whitespace-pre-wrap` e `break-words` (mesmo tratamento de `TicketDescription`).
- Nota interna: fundo próprio em tom âmbar suave (token novo `--internal-note` em `globals.css`, com valor para claro e escuro e contraste AA conferido), borda à esquerda e rótulo "Nota interna" com ícone de cadeado (`lucide-react`, `aria-hidden`). Rótulo em texto, nunca só cor. O tom âmbar não colide com os tons de status nem com o azul de ação do design system.
- Campo de comentário sobre `paper` (o design system reserva essa superfície para "the ticket composer"), botão primário "Enviar resposta" (Electric Blue). Com "Nota interna" marcada, o contorno do campo assume o tom da nota interna, para o usuário perceber antes de enviar que não é uma resposta ao cliente.
- Mobile: coluna única, botão em largura total abaixo do campo. A partir de `md`, o botão fica alinhado à direita.

### 8. Testes

- **Vitest:**
  - `commentSchema`: vazio, só espaços, 5000 e 5001 caracteres depois do trim, trim aplicado, `isInternal` a partir de `"on"` e ausente, `ticketId` inválido.
  - `getCommentAccess`: papel × relação (dono, outro cliente, atribuído, não atribuído) × 5 status.
  - `listComments`/`createComment` em `endpoints.test.ts`: rota, método, query, corpo (sem `isInternal` quando `false`) e Bearer.
  - `listTicketComments`: uma página, várias páginas, página vazia antecipada, ids repetidos, teto com os 2.000 mais recentes e `truncated`, DTO sem `author.id`.
  - `commentAction` com API e `withSession` mockados: validação sem API, sucesso com `refresh` e mensagem por tipo, 422 com cada mensagem e `refresh`, 409 com `refresh` e `values`, 404 `gone` sem `refresh`, 400 mapeado, 403, rede, 401 com renovação única.
  - `CommentThread` e `CommentItem` (Testing Library, como `assignee-picker.test.tsx`): selos, rótulo "Nota interna", texto literal com `<b>`, vazio, falha e aviso de teto.
  - `getCustomerNotice` com o novo texto.
- **Playwright** (`e2e/ticket-comments.spec.ts`, desktop e mobile), só com chamados `[e2e-<timestamp>]` criados pelo teste, e novo helper `commentAs(role, ticketId, body, isInternal?)` em `e2e/support.ts`:
  1. Cliente responde num chamado aberto: selo "Cliente", data, campo limpo e "Resposta enviada.". Texto com `<b>` e quebras de linha aparece literal.
  2. Duplo clique em "Enviar resposta" cria um único comentário.
  3. Atendente não atribuído lê a conversa de um chamado da fila, vê "Assuma o chamado para responder." e, depois de "Assumir", vê o campo.
  4. Atendente atribuído envia uma resposta e uma nota interna. O cliente vê só a resposta.
  5. Cliente em "Aguardando cliente": aviso novo, "Responder" leva o foco ao campo, e a resposta passa o chamado a "Em andamento".
  6. Cliente comenta num chamado "Resolvido", que continua "Resolvido" e com "Reabrir".
  7. Admin comenta num chamado da fila.
  8. Chamado fechado mostra "Chamado fechado não aceita novos comentários.". 422 real: o chamado é fechado por outra sessão antes do envio.
  9. Comentário só com espaços mostra "Escreva um comentário." sem criar comentário.
  10. Sem scroll horizontal em 360px, com nota interna e comentário com palavra longa, e botão de envio com pelo menos 44px.

## Risks / Trade-offs

- **[Risco]** O 422 é diferenciado pelo texto da mensagem da API, que pode mudar. → Mitigação: o mapa é local, testado, e qualquer texto desconhecido cai em "Não é possível comentar na situação atual do chamado."; o `refresh()` mostra o estado real de qualquer forma.
- **[Trade-off]** Num 422 de chamado fechado, o campo é trocado pelo texto de bloqueio e o texto digitado se perde. → Aceito: não há mais onde enviá-lo, e a mensagem do resultado continua visível porque `CommentComposer` fica montado.
- **[Risco]** No 409 da retomada automática, não se sabe pela resposta se o comentário foi gravado. → Mitigação: a conversa é recarregada antes de o usuário reenviar, e o texto é preservado. Se o comentário já aparecer, o usuário não reenvia.
- **[Risco]** Conversas grandes custam até 20 requisições sequenciais na renderização (22 acima do teto, porque as páginas raramente se alinham aos 2.000 mais recentes). → Mitigação: `Suspense` próprio (o chamado aparece antes), teto, `cache` do React. Se virar problema real, pedir à API uma ordem decrescente ou cursor e registrar a divergência.
- **[Risco]** `refresh()` junto com o estado do `useActionState` e o reinício do formulário do React 19 podem apagar o texto no erro. → Mitigação: o padrão de `NewTicketForm` (`values` + `key` + `defaultValue`) já resolve isso. Validar no E2E de erro (422 real e só espaços).
- **[Trade-off]** Sem polling, o atendente não vê uma resposta nova do cliente sem recarregar. → Fora do escopo, como no detalhe. Qualquer envio ou ação recarrega a conversa.
- **[Risco]** Os E2E escrevem comentários em chamados do banco compartilhado. → Mitigação: só chamados criados pelo próprio teste, com prefixo, e o atendente fixo só assume esses chamados.
- **[Risco]** O 404 durante o envio (atendente perde o chamado por reatribuição) depende de outro atendente. → O E2E cria um atendente descartável com `POST /users/staff` (como admin), o admin reatribui o chamado a ele antes do envio e o atendente fixo recebe o 404 real. A Server Action também é coberta pelo Vitest.
