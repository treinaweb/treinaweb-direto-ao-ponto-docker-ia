# TreinaDesk Frontend — Diretrizes gerais

> Referência obrigatória para criar e executar **todas** as specs/changes do frontend.
> Em caso de conflito: as regras de negócio da API (`docs/api-reference.md`) prevalecem sobre este arquivo, e este arquivo prevalece sobre preferências pessoais de implementação.

## Sumário

0. [Fontes da verdade](#0-fontes-da-verdade)
1. [A API é de terceiros](#1-a-api-é-de-terceiros)
2. [Server-first / BFF: o navegador não chama a API](#2-server-first--bff-o-navegador-não-chama-a-api)
3. [Sessão e autenticação com cookies httpOnly](#3-sessão-e-autenticação-com-cookies-httponly)
4. [Validação (zod) e mensagens em pt-BR](#4-validação-zod-e-mensagens-em-pt-br)
5. [Testes](#5-testes)
6. [Responsividade](#6-responsividade)
7. [Convenção de tasks nas specs](#7-convenção-de-tasks-nas-specs)
8. [Checklist antes de arquivar uma change](#8-checklist-antes-de-arquivar-uma-change)

---

## 0. Fontes da verdade

| Assunto | Onde |
|---|---|
| Rotas, papéis, transições, validações e erros da API | `docs/api-reference.md` (**consultar sempre**, antes de cada spec e de cada task que toque a API) |
| Visual, tokens, componentes | `components/ui/references/design-system.md` |
| Next.js 16 (APIs e convenções) | `node_modules/next/dist/docs/`. Esta versão tem breaking changes, então leia o guia antes de escrever código. Ex.: `middleware` agora se chama **`proxy.ts`** |

Stack atual: Next 16 (App Router, `cacheComponents: true`), React 19, Tailwind 4, shadcn/base-ui, TypeScript.

---

## 1. A API é de terceiros

- Trate a API TreinaDesk como **pública e externa**. O frontend conhece só o contrato publicado (Swagger em `/docs` e `/docs-json`, resumido em `docs/api-reference.md`).
- É **proibido** ler, buscar ou alterar o código do projeto local da API, e também acessar o banco dela a partir do frontend ou dos testes.
- Se o comportamento real divergir da referência, **não contorne alterando a API**. Registre a divergência na task como `> Impeditivo:` e, se for o caso, atualize `docs/api-reference.md` a partir do Swagger.
- A URL base vem de `API_BASE_URL` (variável **só de servidor**; nunca `NEXT_PUBLIC_*`). Nunca fixe a URL no código.

---

## 2. Server-first / BFF: o navegador não chama a API

```
 Navegador                 Servidor Next (BFF)                    API TreinaDesk
+------------------+      +----------------------------------+   +--------------------+
| HTML / RSC       |      | proxy.ts  (refresh preventivo)   |   |                    |
| Client Comp.     |----->| Server Components (leitura)      |-->| Bearer accessToken |
| (só UI, sem      |cookie| Server Actions    (mutações)     |   |                    |
|  fetch p/ API)   |<-----| Route Handlers    (exceções)     |<--| JSON               |
+------------------+httpOnly lib/api/* + 'server-only'      |   +--------------------+
                          +----------------------------------+
```

- **O navegador nunca chama a API diretamente.** Ele não vê tokens, nem a URL da API.
- **Padrão:** Server Components para leitura e **Server Actions** para mutações (formulários com `useActionState`).
- **Route Handlers** (`app/**/route.ts`) só quando houver um motivo concreto (ex.: polling, download, integração que exige endpoint HTTP). Eles também precisam autenticar pela sessão do cookie.
- `'use client'` só onde houver interatividade real (estado local, eventos, `useActionState`). Mantenha os Client Components nas folhas da árvore.
- Todo código que chama a API fica em módulos com `import 'server-only'` (sugestão: `lib/api/`). Esses módulos centralizam o header `Authorization`, o parse de `ErrorResponse` e o tratamento de 401.
- Envie ao Client Component só os campos de que ele precisa (DTO enxuto). Nunca serialize tokens ou objetos crus da sessão.
- Com `cacheComponents`, não leia `cookies()`/`headers()` dentro de funções `use cache`. Leia fora e passe o valor, ou use `use cache: private` (ver `02-guides/authentication-with-cache-components.md`). Nunca use token ou dado pessoal como chave/tag de cache.

---

## 3. Sessão e autenticação com cookies httpOnly

### Cookies

| Cookie | Conteúdo | Opções |
|---|---|---|
| `td_access` | `accessToken` (JWT) | `httpOnly`, `secure` em produção, `sameSite: 'lax'`, `path: '/'`, expira junto com o `exp` do JWT |
| `td_refresh` | `refreshToken` (opaco) | `httpOnly`, `secure` em produção, `sameSite: 'lax'`, `path: '/'`, 7 dias |

- Os tokens **nunca** ficam em `localStorage`, `sessionStorage`, estado React ou props.
- Login: Server Action chama `POST /auth/login`, grava os dois cookies e redireciona.
- Logout: Server Action chama `POST /auth/logout` com o refresh token, **apaga os cookies mesmo se a API falhar** e redireciona para o login.

### Refresh: onde pode e onde não pode acontecer

O refresh token é **rotacionado a cada uso** e **reutilizá-lo revoga todas as sessões do usuário**. No Next, **Server Components não podem gravar cookies**. Logo, um refresh feito durante a renderização perderia o novo token, e o próximo refresh reutilizaria o antigo, revogando tudo.

| Lugar | Pode fazer refresh? | Como |
|---|---|---|
| `proxy.ts` | **Sim (preventivo)** | Decodifica o `exp` do JWT (sem verificar assinatura). Se faltar menos de ~60 s ou o access estiver ausente com refresh presente, chama `POST /auth/refresh`. Grava os cookies novos **na response** e **nos cookies da request encaminhada**, para que a renderização já use o token novo. Se o refresh falhar com 401, apaga os cookies e redireciona para o login |
| Server Action / Route Handler | **Sim (reativo)** | Se receber 401, faz um refresh, grava os cookies e repete a requisição **uma vez** |
| Server Component | **Não** | Se receber 401, chama `redirect('/login')`. Nunca chama `/auth/refresh` |

- **Single-flight obrigatório:** só uma renovação em andamento por refresh token. Requisições concorrentes com o mesmo token aguardam a mesma promessa, e o resultado fica reaproveitável por uma janela curta (~10 s), indexado pelo hash do token. Limitação conhecida: o mapa em memória vale para uma única instância do servidor. Com várias instâncias seria preciso um lock externo.
- **Mudança de papel** revoga as sessões do afetado. O novo papel só vale no próximo login.

### Autorização

- A UI (navegação, botões) é montada a partir do `role` de `GET /users/me`, obtido por uma função de DAL (ex.: `getCurrentUser()` em `lib/auth/`, envolvida em `cache` do React para não repetir a chamada na mesma renderização).
- Esconder a ação na UI **não é segurança**. A API reaplica as regras, e toda Server Action verifica a sessão antes de chamar a API.
- O `proxy.ts` faz apenas checagens otimistas (há cookie? redireciona para `/login`). A verificação real fica no DAL e na API.

---

## 4. Validação (zod) e mensagens em pt-BR

- Use **zod** para todo dado de entrada: formulários, `searchParams`/`params` (ex.: UUID, `page`, `limit`) e, quando útil, respostas da API.
- Os schemas espelham a tabela **"Validações de formulário"** de `docs/api-reference.md` (limites de tamanho, enums, UUID, trim etc.). Centralize em um módulo (sugestão: `lib/validation/`) e reutilize no servidor e no cliente.
- **Validação no servidor é obrigatória** (na Server Action, antes de chamar a API). No cliente é opcional, para feedback imediato.
- **Todas as mensagens visíveis ao usuário em pt-BR:** validação, toasts, alertas, páginas de erro, `not-found`, estados vazios e mensagens de exceção. Defina mensagens explícitas em cada regra zod (não dependa do texto padrão em inglês).
- Mapeie o `ErrorResponse` da API por status (ver "Erros" em `docs/api-reference.md`):

| Status | Tratamento |
|---|---|
| 400 | Mensagens de validação nos campos (o `message` pode ser array) |
| 401 | Refresh conforme a seção 3. Se falhar, ir para o login |
| 403 | "Você não tem permissão para esta ação." |
| 404 | Tela de "não encontrado" (sem diferenciar inexistente de fora da visibilidade) |
| 409 | Duplicado: erro no campo. Concorrência: recarregar o recurso e avisar o usuário |
| 422 | Exibir a regra violada em toast ou alerta |
| 5xx / rede | Mensagem genérica em pt-BR. Nunca exibir stack ou detalhes internos |

- As mensagens da API podem vir em inglês. Traduza as conhecidas por um mapa e use um texto genérico em pt-BR para as demais.
- Exceções inesperadas caem em `error.tsx` com texto em pt-BR e opção de tentar de novo.

---

## 5. Testes

### Unitários: Vitest

- Cobrem lógica pura e de servidor: schemas zod, mapeamento de erros, regras de transição de status por papel, cliente HTTP (com `fetch` mockado), single-flight do refresh, helpers de cookie/JWT.
- Arquivos `*.test.ts(x)` ao lado do código ou em `__tests__/`. Siga `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`.

### E2E: Playwright contra a API real

- Rodam contra o frontend (`next dev` ou o servidor de produção `node .next/standalone/server.js`; o `next start` não é indicado com `output: "standalone"`) apontando para a **API real** em `API_BASE_URL`. Sem mocks da API.
- Siga `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.
- **Usuários fixos** existentes na API. As credenciais ficam **somente** no `.env.e2e`, que não é versionado (o `.gitignore` já cobre `.env*`). Nunca escreva senhas em código, specs ou docs.

| Papel | Variáveis |
|---|---|
| ADMIN | `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` |
| SUPPORT | `E2E_SUPPORT_EMAIL`, `E2E_SUPPORT_PASSWORD` |
| CUSTOMER | `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD` |

- **Regras de isolamento** (a API e o banco são compartilhados):
  - **Nunca** chame `PATCH /users/{id}/role` nos usuários fixos. Isso revoga as sessões deles e quebra os outros testes. Para testar troca de papel, crie um usuário descartável.
  - Testes de sessão (logout, refresh, revogação) usam usuários próprios criados via `POST /users`, nunca os fixos.
  - Os dados criados pelos testes levam um prefixo único (ex.: `[e2e-<timestamp>]` no título). Não dependa de totais, de listas vazias nem de dados de outros testes.
  - Não existe exclusão de categorias. Crie categorias de teste com nome único e desative-as ao final, quando fizer sentido.
- Cada fluxo crítico roda em viewport **desktop** e **mobile** (projetos do Playwright).
- Se a API estiver fora do ar, o teste falha com uma mensagem clara. Não pule silenciosamente.

---

## 6. Responsividade

- **Todas** as páginas e componentes são responsivos, com abordagem **mobile-first** e breakpoints padrão do Tailwind (`sm`, `md`, `lg`, `xl`).
- A shell de 3 colunas do design system (sidebar, workspace, rail direito) vira:
  - `< lg`: o rail direito sai do layout (vira seção/aba ou é omitido).
  - `< md`: coluna única, com a sidebar em drawer acionado por botão no top bar.
- Tabelas/listas de tickets: em telas pequenas, viram cards ou ganham scroll horizontal **dentro do painel** (nunca na página).
- Alvos de toque ≥ 44px. Sem hover como única forma de acesso. Formulários em uma coluna no mobile.
- Nenhuma página pode ter scroll horizontal em 360px de largura.
- Siga os tokens e regras de cor do design system (status/prioridade sempre com texto + cor, temas claro e escuro).

---

## 7. Convenção de tasks nas specs

Em todo `tasks.md`, **logo abaixo de cada task**, adicione uma linha explicando como ela foi implementada ou o que impediu:

```markdown
- [x] 2.1 Criar Server Action de login
  > Implementação: `app/(auth)/login/actions.ts` valida com `loginSchema`, chama `POST /auth/login` e grava `td_access`/`td_refresh`; testado em `login.test.ts`.
- [ ] 2.2 Exibir avatar do usuário
  > Impeditivo: a API não expõe URL de avatar; usado fallback com iniciais até haver endpoint.
```

- A linha é escrita durante a implementação (`/opsx:apply`), não na criação da spec.
- Seja específico: arquivos, decisões e testes. Para impeditivos, diga o que faltou e qual foi o contorno (se houve).
- Uma task não pode ser marcada `[x]` sem a linha `> Implementação:`.

---

## 8. Checklist antes de arquivar uma change

- [ ] Consultei `docs/api-reference.md` e as regras de papel/status foram respeitadas.
- [ ] Nenhuma chamada à API sai do navegador (verificar a aba Network).
- [ ] Tokens só em cookies httpOnly. Nenhum refresh dentro de Server Component.
- [ ] Entradas validadas com zod no servidor. Todas as mensagens em pt-BR.
- [ ] Erros 400/401/403/404/409/422 tratados conforme a seção 4.
- [ ] Testes Vitest passando. E2E Playwright passando contra a API real (desktop + mobile).
- [ ] Páginas verificadas em 360px, 768px e ≥ 1280px, nos temas claro e escuro.
- [ ] Toda task com sua linha `> Implementação:` ou `> Impeditivo:`.
- [ ] Nenhum segredo (senha, token, `.env`) versionado.
