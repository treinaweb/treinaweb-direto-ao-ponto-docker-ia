# Proposal

## Why

O TreinaDesk ainda não tem nenhuma tela funcional: toda funcionalidade futura (tickets, comentários, categorias, administração) depende de um usuário autenticado e do `role` dele. Esta é a primeira change do frontend e estabelece a sessão do usuário (entrar, criar conta, manter a sessão ativa e sair) sobre a API TreinaDesk, junto com a fundação server-first (BFF) que todas as próximas changes vão reutilizar.

## What Changes

- Tela **Entrar** (`/login`): formulário de e-mail e senha, validado no servidor, que autentica via `POST /auth/login`, grava os tokens em cookies httpOnly e redireciona para o destino solicitado (`?next=`, só caminhos internos) ou para `/dashboard`.
- Tela **Criar conta** (`/cadastro`): nome, e-mail, senha e confirmação de senha. Cria a conta via `POST /users` (sempre `CUSTOMER`) e em seguida faz login automático, levando o usuário direto ao `/dashboard`. Se o login automático falhar, leva a `/login` com o aviso de conta criada.
- **Manter a sessão ativa**: renovação preventiva dos tokens antes de o access token expirar (15 min) e renovação reativa em caso de 401 nas mutações, com *single-flight* para nunca reutilizar um refresh token (a API revoga todas as sessões nesse caso). Sessão deslizante de 7 dias pelo refresh token.
- **Sair**: encerra a sessão na API (`POST /auth/logout`) e apaga os cookies mesmo se a API falhar.
- **Proteção de rotas**: visitante sem sessão em rota protegida vai para `/login?next=...`; usuário logado em `/login` ou `/cadastro` vai para `/dashboard`; sessão expirada/revogada leva ao login com aviso.
- **Dashboard mínimo** (`/dashboard`): saudação com o nome, o papel do usuário e o botão Sair em um top bar responsivo. A shell completa de 3 colunas do design system fica para uma change futura.
- **Fundação técnica** (primeira change do projeto): cliente HTTP server-only da API, mapeamento de erros em pt-BR, validação com zod, `proxy.ts`, DAL `getCurrentUser()`, e configuração de Vitest e Playwright (desktop + mobile, contra a API real).
- Correção em `docs/api-reference.md`: no `LoginDto` o e-mail é apenas string obrigatória (o formato e o máximo de 200 valem só para o cadastro). O frontend mantém a validação de formato de e-mail também no login, por decisão de produto.

## Capabilities

### New Capabilities

- `auth-session`: ciclo de vida da sessão do usuário: entrar, manter a sessão ativa (renovação de tokens), proteção de rotas, identificação do usuário logado e sair.
- `account-signup`: cadastro público de clientes (`CUSTOMER`), com validação, tratamento de e-mail duplicado e entrada automática após o cadastro.

### Modified Capabilities

_Nenhuma: não há specs existentes no projeto._

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (seções 1 a 7: API de terceiros, BFF server-first, cookies httpOnly e regras de refresh, zod em pt-BR, testes, responsividade, convenção de tasks) e `docs/api-reference.md` (seções "Autenticação e sessão", "Endpoints > Auth" e "Users", "Validações de formulário" e "Erros"). Contrato conferido no Swagger (`/docs-json`).
- **Endpoints da API usados:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /users`, `GET /users/me`.
- **Código novo:** `proxy.ts`, `app/(auth)/login`, `app/(auth)/cadastro`, `app/dashboard`, `lib/api/`, `lib/auth/`, `lib/validation/`; `app/page.tsx` de exemplo passa a redirecionar conforme a sessão.
- **Dependências:** `zod` (declarada explicitamente), `server-only`; dev: `vitest` e afins, `@playwright/test`.
- **Configuração:** `API_BASE_URL` (somente servidor); `.env.e2e` com usuários fixos (não versionado).
- **Docs:** `docs/api-reference.md` (regra de e-mail do login).
