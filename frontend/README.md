# TreinaDesk — Frontend

Frontend do helpdesk TreinaDesk em Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind 4 e shadcn/base-ui.

O navegador nunca chama a API: toda chamada passa pelo servidor Next (BFF), e os tokens ficam só em cookies httpOnly. Leia antes de contribuir:

- `docs/frontend-guidelines.md`: regras obrigatórias (BFF, cookies, refresh, zod em pt-BR, testes, responsividade).
- `docs/api-reference.md`: contrato da API (Swagger em `http://localhost:3000/docs`).
- `components/ui/references/design-system.md`: design system.

## API

O backend fica em outro repositório: [treinaweb/treinaweb-treinadesk](https://github.com/treinaweb/treinaweb-treinadesk). Siga o README de lá para subir a API localmente.

Para explorar os endpoints à mão, importe `endpoints-treinadesk-api.yaml` no Insomnia (Import → arquivo). A coleção cobre health check, Auth (login, refresh, logout), Users, Categories e Tickets (criação, atribuição, status e comentários). Os tokens e IDs salvos nas requisições são de exemplo: faça login e troque o bearer token e os IDs pelos do seu ambiente.

## Configuração

Pré-requisitos: Node 24 e a API TreinaDesk rodando (por padrão em `http://localhost:3000`).

```bash
npm install
cp .env.example .env.local   # ajuste API_BASE_URL se necessário
```

`API_BASE_URL` é variável **só de servidor** (nunca `NEXT_PUBLIC_*`).

## Desenvolvimento

A API já ocupa a porta 3000, então suba o Next em outra porta:

```bash
npm run dev -- --port 3001
```

Abra `http://localhost:3001`: `/login`, `/cadastro` e `/dashboard` (protegido).

## Testes

### Unitários (Vitest)

```bash
npm test            # uma execução
npm run test:watch  # modo watch
```

### E2E (Playwright, contra a API real)

1. Crie o `.env.e2e` a partir do `.env.example` (não é versionado). Defina `API_BASE_URL` e, para os testes de papel, as credenciais dos usuários fixos `E2E_ADMIN_*`, `E2E_SUPPORT_*` e `E2E_CUSTOMER_*`. Sem essas credenciais, os testes de papel aparecem como pulados, com o motivo no relatório.
2. Instale o navegador uma vez: `npx playwright install chromium`.
3. Com a API rodando:

```bash
npm run test:e2e
```

O Playwright sobe o `next dev` na porta `E2E_PORT` (padrão 3100) e roda cada teste nos projetos `desktop` e `mobile`. Se a API não responder, a execução falha com uma mensagem clara.

Os testes de sessão criam usuários descartáveis (`e2e+...@treinadesk.test`) via `POST /users`. Nunca altere o papel dos usuários fixos.

## Estrutura

```
proxy.ts               refresh preventivo e redirecionamentos por sessão
app/(auth)/            /login e /cadastro (Server Actions + formulários)
app/dashboard/         área autenticada
lib/api/               cliente HTTP da API (server-only) e mapeamento de erros
lib/auth/              cookies, JWT, refresh single-flight, DAL, logout
lib/validation/        schemas zod com mensagens pt-BR
e2e/                   testes Playwright
```
