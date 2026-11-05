# Design

## Context

- Projeto greenfield: só existem `app/layout.tsx`, `app/page.tsx` de exemplo, `components/ui/button.tsx` e `lib/utils.ts`. Não há specs anteriores. Motivação em `proposal.md` (Why).
- Stack: Next 16.4 (App Router, `cacheComponents: true`, `partialPrefetching: true`), React 19.3, Tailwind 4, shadcn com `@base-ui/react`. No Next 16 o antigo `middleware` chama-se **`proxy.ts`** e roda por padrão no runtime **Node.js**.
- `zod` 4.6.5 já está em `node_modules` (transitivo), mas não declarado em `package.json`. `vitest`, `@playwright/test` e `server-only` não estão instalados.
- Contrato conferido no Swagger (`/docs-json`): `POST /auth/login` → 200 `{accessToken, refreshToken}` | 400 | 401; `POST /users` → 201 `PublicUserResponse` (sem tokens) | 400 | 409; `POST /auth/refresh` → 200 par novo | 400 | 401; `POST /auth/logout` (Bearer) → 204 | 400 | 401; `GET /users/me` → 200 | 401. Nenhuma dessas rotas retorna 403, 404 ou 422; esses status caem no tratamento genérico do cliente HTTP.
- Validade informada pela API: `JWT_ACCESS_EXPIRES_IN=15m` e `REFRESH_TOKEN_TTL_DAYS=7`.
- Restrições vêm de `docs/frontend-guidelines.md` (seções 1 a 6), especialmente as regras de refresh da seção 3.

## Goals / Non-Goals

**Goals:**
- Toda chamada à API acontece no servidor Next (proxy, Server Components, Server Actions). Zero chamadas do navegador à API.
- Um ponto único para: URL base, header `Authorization`, parse de `ErrorResponse`, tradução de erros e renovação de tokens.
- Renovação segura: nunca enviar o mesmo refresh token duas vezes.
- Deixar a fundação (`lib/api`, `lib/auth`, `lib/validation`, Vitest, Playwright) pronta para as próximas changes.

**Non-Goals:**
- Shell de 3 colunas, sidebar, KPIs e listas de tickets (próxima change).
- "Esqueci minha senha", verificação de e-mail, "lembrar de mim" (a API não oferece).
- Lock distribuído para várias instâncias do servidor.
- Cadastro de staff (`POST /users/staff`) e troca de papel.

## Decisions

### 1. Onde cada operação acontece

```
 Navegador                     Servidor Next (BFF)                            API
+-----------------+   cookie  +-------------------------------------------+  +--------+
| /login (form)   |---------->| proxy.ts                                  |  |        |
| /cadastro (form)|  httpOnly |  - redireciona por presença de cookie     |  |        |
| /dashboard      |<----------|  - refresh preventivo (single-flight) ----|->| /auth/ |
| botão Sair      |           | Server Actions (mutações)                 |  | refresh|
|                 |           |  - loginAction    ------------------------|->| /auth/ |
| Client Comp.:   |           |  - signupAction   ------------------------|->| /users |
| só formulários  |           |  - logoutAction   ------------------------|->| logout |
| (useActionState)|           | Server Components (leitura)               |  |        |
+-----------------+           |  - getCurrentUser() ----------------------|->| /users/|
                              | lib/api/* e lib/auth/* com 'server-only'  |  |  me    |
                              +-------------------------------------------+  +--------+
```

| Operação | Onde | Endpoint |
|---|---|---|
| Entrar | Server Action `loginAction` (`app/(auth)/login/actions.ts`) | `POST /auth/login` |
| Criar conta | Server Action `signupAction` (`app/(auth)/cadastro/actions.ts`) | `POST /users`, depois `POST /auth/login` |
| Usuário logado | Server Component via DAL `getCurrentUser()` | `GET /users/me` |
| Refresh preventivo | `proxy.ts` | `POST /auth/refresh` |
| Refresh reativo | wrapper de Server Action (`withSession`) | `POST /auth/refresh` |
| Sair | Server Action `logoutAction` | `POST /auth/logout` |

Não há Route Handlers nesta change: nenhum caso exige endpoint HTTP próprio. **Confirmado: nenhuma chamada sai do navegador para a API**, e `API_BASE_URL` só é lida em módulos `server-only`.

### 2. Módulos

```
lib/
  env.ts                 API_BASE_URL validada com zod (falha cedo se ausente)
  api/
    client.ts            apiFetch(path, {method, body, accessToken}) -> T | throws ApiError
    errors.ts            ApiError {status, messages[]}; toUserMessage(); mapa EN->pt-BR
    auth.ts              login(), refresh(), logout()   (chamadas cruas, sem cookies)
    users.ts             createUser(), getMe(token)
  auth/
    cookies.ts           nomes/opções de td_access e td_refresh; set/clear p/ cookies()
                         e p/ NextResponse/RequestCookies (proxy)
    jwt.ts               readExp(token): decodifica o payload base64url, sem verificar assinatura
    refresh.ts           refreshSingleFlight(refreshToken) -> Promise<TokenPair>
    dal.ts               getCurrentUser() envolvido em React cache(); requireSession()
    session-action.ts    withSession(fn): 401 -> refresh 1x -> repete 1x -> senão logout+redirect
    redirect.ts          safeNext(next): só "/..." que não começa com "//" nem "/\"
  validation/
    auth.ts              loginSchema, signupSchema (mensagens pt-BR)
```

Alternativa considerada: um único `lib/session.ts`. Rejeitada porque o proxy, as actions e os testes precisam de partes isoladas (o decode do JWT e o single-flight são testados sozinhos).

### 3. Cookies

- `td_access`: `maxAge = exp - agora` (lido do JWT). Se o `exp` não puder ser lido, usa 15 min.
- `td_refresh`: `maxAge = 7 dias`, regravado a cada rotação (sessão deslizante, igual ao TTL da API).
- Ambos `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure: process.env.NODE_ENV === 'production'`.
- Nas Server Actions grava-se com `cookies()` de `next/headers`. No proxy grava-se em `response.cookies` **e** reescreve-se o header `Cookie` da request encaminhada (`NextResponse.next({ request: { headers } })`), para que a renderização da mesma requisição já leia o token novo.

### 4. proxy.ts

```
matcher: tudo exceto _next/static, _next/image, favicon.ico e arquivos com extensão

1. lê td_access / td_refresh
2. se precisa renovar (access ausente ou exp - agora < 60s) e há refresh:
       r = await refreshSingleFlight(refresh)
       ok  -> grava cookies na response e na request encaminhada
       401 -> apaga cookies; se rota protegida -> /login?next=<rota>&aviso=sessao-expirada
       rede/5xx -> segue sem renovar (a página tratará o 401, se houver)
3. "/"                      -> /dashboard (com sessão) | /login (sem)
4. rota protegida sem sessão -> /login?next=<rota>
5. /login ou /cadastro com sessão -> /dashboard
```

- "Com sessão" no proxy é checagem **otimista** (há cookie válido ou acabou de renovar). A verificação real é `getCurrentUser()` e a própria API.
- Rotas protegidas nesta change: `/dashboard` e subrotas. Lista central em `lib/auth/routes.ts`, para as próximas changes acrescentarem.
- O proxy também roda nos POSTs de Server Action (eles vão para a rota da página), então o logout e futuras mutações chegam com token já renovado. Mesmo assim cada action revalida a sessão (o Next recomenda não depender só do proxy).

### 5. Single-flight do refresh

- `Map<hash(refreshToken), {promise, expiresAt}>`. `hash` = SHA-256 (via `node:crypto`), para não manter o token cru como chave.
- A primeira chamada cria a promessa; as concorrentes recebem a mesma. O resultado (sucesso **ou** 401) fica reaproveitável por 10 s, para cobrir requisições que chegam logo depois com o cookie antigo (por exemplo, prefetches paralelos).
- O mapa fica em `globalThis` (chave `Symbol.for('treinadesk.refresh')`): o `proxy.ts` e as Server Actions podem ser empacotados em módulos diferentes, e o `globalThis` garante um único mapa por processo Node.
- Limitação aceita: vale para uma instância. Documentado em Risks.

Alternativa considerada: renovar só reativamente (em 401). Rejeitada porque Server Components não podem gravar cookies; sem o preventivo, toda página após 15 min cairia no login.

### 6. Server Components e 401

`getCurrentUser()` (React `cache`) lê `td_access` via `cookies()`, chama `GET /users/me` e devolve um DTO enxuto `{ name, role }`. Em 401 ou sem cookie chama `redirect('/login?aviso=sessao-expirada')`; **nunca** chama `/auth/refresh`.

Decisão tomada na implementação: como o Server Component não pode apagar cookies, um access token ainda não expirado mas recusado pela API causaria loop (`/dashboard` → `/login` → proxy vê sessão → `/dashboard`). Por isso o proxy, ao receber uma rota de visitante com `aviso=sessao-expirada`, apaga os cookies locais (sem chamar a API) e mostra o login. Um link externo com esse parâmetro só encerra a sessão local, o mesmo efeito de um logout. Não se usa `use cache`/`use cache: private` aqui: o `redirect` e a leitura por requisição já bastam, e não se pode usar token como chave de cache.

Com `cacheComponents`, o trecho que lê cookies fica atrás de `<Suspense>` (por exemplo, o bloco de saudação do dashboard), mantendo o top bar estático no shell.

### 7. Formulários e Server Actions

- Na página de login, o formulário fica no shell estático. Só o aviso (`?aviso=`) e o campo oculto `next` leem `searchParams`, cada um em seu próprio `<Suspense>`, passados como slots ao formulário. Envolver o formulário inteiro em `<Suspense>` trocava o fallback pelo formulário real durante o streaming e apagava o que o usuário já tinha digitado (detectado no E2E).

- Client Components pequenos (`LoginForm`, `SignupForm`, `LogoutButton`) com `useActionState`; o resto da página é Server Component.
- Estado retornado pela action: `{ fieldErrors?: Record<campo, string>, formError?: string, values?: { email, name } }`. Senhas nunca voltam no estado.
- Sucesso termina com `redirect()` (fora de `try/catch`, para não engolir o redirect).
- Validação: o mesmo schema zod roda no servidor (obrigatório). No cliente, os atributos HTML (`required`, `type="email"`, `maxLength`) dão feedback imediato; validação zod no cliente fica opcional.
- `signupAction`: `POST /users` → em 409 erro no campo e-mail → em 201 chama `POST /auth/login`; se o login falhar, `redirect('/login?aviso=conta-criada')` e **não** recria a conta.

### 8. Mensagens e avisos

- `lib/api/errors.ts` mapeia por status (seção 4 das diretrizes) e traduz as mensagens 400 conhecidas da API (class-validator em inglês, por exemplo `email must be an email`) para o campo e texto pt-BR. Mensagens desconhecidas viram texto genérico; nunca se exibe o texto original.
- Avisos entre telas (logout, sessão expirada, conta criada) usam `?aviso=<código>` com um conjunto fechado de códigos mapeados para textos fixos. Nada do query string é renderizado diretamente, o que evita injeção de texto.

### 9. Validação (`lib/validation/auth.ts`)

| Schema | Regras |
|---|---|
| `loginSchema` | `email`: trim, obrigatório, `z.email()`; `password`: obrigatório, máx. 128 |
| `signupSchema` | `name`: trim, 2–100; `email`: trim + lowercase, `z.email()`, máx. 200; `password`: 8–128; `confirmPassword`: igual a `password` (`refine` com path `confirmPassword`) |

O login é mais restritivo que a API (que aceita qualquer string), decisão confirmada pelo usuário: nenhum e-mail cadastrado pode ser inválido, já que o cadastro exige o formato.

### 10. UI

- Layout `app/(auth)/layout.tsx`: canvas, painel `cloud` centralizado (`max-w-md`, `rounded-xl`), marca TreinaDesk, uma coluna; no desktop o painel fica centralizado com respiro vertical (`spacing.section`).
- Componentes shadcn necessários: `input`, `label`, `card`/painel e `alert` (adicionados via CLI shadcn). Botões e inputs com altura mínima de 44px.
- `/dashboard`: top bar simples (marca à esquerda; nome, papel e "Sair" à direita). Abaixo de `sm`, nome e papel saem do top bar e ficam só na saudação.

### 11. Testes

- **Vitest** (ambiente `node`, conforme `02-guides/testing/vitest.md`): schemas, `safeNext`, `readExp`, mapeamento de erros, `apiFetch` com `fetch` mockado, single-flight (concorrência e janela de 10 s), `withSession` (401 → refresh → repete uma vez).
- **Playwright** (conforme `02-guides/testing/playwright.md`): projetos `desktop` (Chromium 1280x800) e `mobile` (Pixel 7); `webServer` sobe o Next apontando para a API real. Credenciais em `.env.e2e`, carregado no `playwright.config.ts`.
- Os testes de sessão (logout, refresh, revogação) usam **usuários descartáveis** criados pelo próprio cadastro, com e-mail único `e2e+<timestamp>-<rand>@treinadesk.test`. Os usuários fixos só são usados para checar papéis no dashboard e nunca têm o papel alterado.
- Expiração simulada no E2E: apagar `td_access` do contexto do navegador (força o refresh preventivo) e reutilizar um refresh antigo (força a revogação), sem esperar 15 min.

## Risks / Trade-offs

- [Várias instâncias do servidor compartilhando o mesmo usuário] → o single-flight em memória não coordena instâncias; com mais de uma instância seria preciso lock externo (Redis). Fica fora do escopo, documentado aqui e no código.
- [Proxy e Server Actions em bundles diferentes não compartilharem o mapa] → mapa em `globalThis` com `Symbol.for`, e um teste E2E com navegações paralelas para confirmar que a sessão não é revogada.
- [JWT sem `exp` ou relógio do servidor dessincronizado] → fallback de 15 min no cookie, margem de 60 s e a renovação reativa nas actions. O E2E confirma que o token da API traz `exp`.
- [Prefetch de links disparando renovações] → coberto pelo single-flight com janela de 10 s; o resultado é reaproveitado.
- [Mensagens 400 da API mudarem de texto] → mensagens desconhecidas viram genéricas em pt-BR; o teste do mapeamento lista os textos conhecidos.
- [Logout com access expirado e proxy sem conseguir renovar] → a action apaga os cookies mesmo assim; o refresh token órfão expira em até 7 dias na API.
- [Login mais restritivo que a API] → aceito; uma conta só existe se passou pelo `z.email()` do cadastro ou pelo cadastro de staff, que também valida formato.

## Migration Plan

Não há dados nem usuários do frontend para migrar. Implantação: configurar `API_BASE_URL` no ambiente do servidor. Rollback: reverter o deploy; os cookies `td_*` deixados nos navegadores são ignorados pela versão anterior.

## Open Questions

- Textos exatos das mensagens 400 da API (class-validator) para completar o mapa EN→pt-BR: serão levantados na implementação a partir de respostas reais, sem alterar specs nem a abordagem.
