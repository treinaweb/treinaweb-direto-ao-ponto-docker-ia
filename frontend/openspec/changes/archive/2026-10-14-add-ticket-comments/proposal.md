# Proposal

## Why

O detalhe do chamado (`add-ticket-detail`) já permite assumir, atribuir e mudar o status, mas ninguém conversa: o atendente não pergunta nada ao cliente, o cliente em "Aguardando cliente" só vê o aviso "Em breve você poderá responder por aqui." e a equipe não tem onde registrar o que fez. Sem comentários, o status "Aguardando cliente" fica sem saída pela tela, porque a retomada para "Em andamento" acontece justamente quando o cliente comenta.

## What Changes

- **Conversa no detalhe do chamado**, logo abaixo da descrição em `/chamados/{id}`: a conversa inteira, do comentário mais antigo para o mais recente, sem paginação na tela. Cada comentário mostra o autor, o selo "Equipe" ou "Cliente", a data e a hora e o texto simples, com as quebras de linha preservadas e sem interpretar HTML.
- **Notas internas** com visual próprio e o rótulo "Nota interna", visíveis só para a equipe. A API nunca as devolve ao cliente.
- **Campo de comentário** que oferece só o que a API aceitaria (`docs/api-reference.md`, "Regras de comentários"):
  - `CUSTOMER` dono: comenta enquanto o chamado não estiver fechado.
  - `SUPPORT`: comenta só quando é o atendente atribuído. Nos outros casos vê "Assuma o chamado para responder.".
  - `ADMIN`: comenta em qualquer chamado que não esteja fechado, inclusive na fila.
  - Chamado fechado: "Chamado fechado não aceita novos comentários." para todos.
  - O envio é, por padrão, uma resposta ao cliente. A nota interna é uma opção explícita, só para `SUPPORT` e `ADMIN`.
- **Depois de comentar**, o chamado e a conversa são recarregados, porque o status pode mudar: a resposta do cliente em "Aguardando cliente" leva o chamado para "Em andamento". Em "Resolvido", o chamado não é reaberto.
- **Erros:** 400 aparece no campo, 409 recarrega e avisa, 422 explica a regra e recarrega, 404 avisa que o chamado não está mais disponível, e 403, 401, rede e 5xx seguem as diretrizes. O texto digitado é preservado e o envio é único.
- **Falha isolada:** se a conversa não carregar, o restante do chamado continua funcionando.
- **Aviso ao cliente aguardando resposta** passa a convidar o cliente a responder pelos comentários, em vez de "Em breve você poderá responder por aqui.".

## Capabilities

### New Capabilities

- `ticket-comments`: leitura da conversa de um chamado (comentários e notas internas) e envio de comentários pelo detalhe do chamado, respeitando papel, relação com o chamado e status, com validação, mensagens e tratamento de erros.

### Modified Capabilities

- `ticket-detail`: o requisito "Aviso ao cliente aguardando resposta" troca o texto "Em breve você poderá responder por aqui." por um convite para responder pelos comentários abaixo.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (Server Component para leitura, Server Action com refresh reativo para a mutação, nenhuma chamada do navegador à API, zod com mensagens pt-BR, mapeamento de 400/401/403/404/409/422, testes Vitest e Playwright e responsividade) e `docs/api-reference.md`, seções "Comments", "Regras de comentários", "Transições de status" (`WAITING_CUSTOMER → IN_PROGRESS` automático), "Modelos" (`CreateCommentDto`, `CommentResponse`) e "Validações de formulário" (`body` de 1 a 5000 caracteres depois do trim, `limit` máximo 100).
- **Endpoints da API:** `GET /tickets/{id}/comments` (paginado, 100 por página) e `POST /tickets/{id}/comments`, além de `GET /tickets/{id}` e `GET /users/me`, que o detalhe já usa.
- **Código:** novo `lib/api/comments.ts`, regra pura de quem pode comentar em `lib/tickets/`, schema zod em `lib/validation/`, Server Action de comentário em `app/(app)/chamados/[id]/`, componentes da conversa e do campo em `components/tickets/` e ajuste em `app/(app)/chamados/[id]/page.tsx` e no texto de `getCustomerNotice`.
- **Dependências:** depende de `add-ticket-detail` (já arquivada). Não depende de `add-category-admin` nem de `add-user-admin`.
- **Fora do escopo:** editar ou apagar comentários (a API não oferece), anexos, menções, notificações e atualização em tempo real da conversa.
- **Testes:** Vitest para o schema, a regra de quem comenta, a leitura paginada com teto, a Server Action e a renderização da conversa. Playwright contra a API real (desktop e mobile) com chamados `[e2e-<timestamp>]` criados pelo próprio teste.
