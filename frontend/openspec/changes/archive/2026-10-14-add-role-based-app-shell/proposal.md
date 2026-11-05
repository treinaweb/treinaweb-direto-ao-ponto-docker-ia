# Proposal

## Why

Hoje a área autenticada é só o `/dashboard` com uma saudação e o texto "Em breve seus chamados aparecerão aqui". Todas as próximas funcionalidades (chamados, abrir chamado, categorias, usuários) precisam de uma moldura comum que saiba quem é o usuário e mostre a ele só o que o papel dele permite. Construir essa shell agora, junto com um painel que já entrega números reais, evita que cada página futura reinvente navegação, layout responsivo e controle de acesso por papel.

## What Changes

- **Layout único das páginas autenticadas**, seguindo as referências `Dashboard-reference-white.png` / `Dashboard-reference-dark-theme.png` e o design system: sidebar à esquerda (marca, navegação, usuário logado com "Sair") e área de trabalho com top bar (breadcrumb) e conteúdo. A sidebar vira rail de ícones no tablet e drawer no mobile.
- **Navegação por papel**, montada a partir do `role` de `GET /users/me`:
  - `CUSTOMER`: Painel, "Meus chamados" e o botão "Abrir chamado".
  - `SUPPORT`: Painel e "Chamados".
  - `ADMIN`: Painel, "Chamados" e o grupo "Administração" (Categorias, Usuários).
- **Painel (`/dashboard`) por papel**, com estatísticas obtidas da API (contagens via `total` de `GET /tickets` filtrado por status/prioridade, `GET /users` e `GET /categories`):
  - `CUSTOMER`: KPIs por status, "Precisam da sua atenção" e chamados recentes.
  - `SUPPORT`: KPIs da fila e dos seus chamados, próximos chamados da fila e fila por prioridade.
  - `ADMIN`: KPIs por status, distribuição por status (donut) e por prioridade (barras), resumo de categorias e de usuários.
- **Páginas "Em breve"** para `/chamados`, `/chamados/novo`, `/categorias` e `/usuarios`, já protegidas por papel no servidor (404 para quem não tem acesso), para que a navegação não leve a links quebrados.
- Sem tendências (%) nem séries temporais, sem rail direito, busca ou notificações das referências: a API não fornece esses dados e o frontend não exibirá números inventados.
- O botão "Sair" sai do top bar e passa para a área do usuário na sidebar (no mobile, dentro do drawer).

## Capabilities

### New Capabilities

- `app-shell`: moldura das páginas autenticadas: layout (sidebar, top bar, área de conteúdo), navegação por papel, comportamento responsivo e controle de acesso por papel às páginas.
- `role-dashboard`: painel inicial de cada papel, com indicadores e listas resumidas obtidos da API e tratamento de falhas por painel.

### Modified Capabilities

- `auth-session`: a proteção de rotas passa a cobrir `/chamados`, `/categorias` e `/usuarios` (e subrotas) além do `/dashboard`; o botão "Sair" e a identificação do usuário saem do top bar e vão para a sidebar; o requisito responsivo do top bar do dashboard passa a descrever o drawer da sidebar no mobile.

## Impact

- **Referências seguidas:** `docs/frontend-guidelines.md` (BFF server-first, autorização pelo DAL, mapeamento de erros, testes e responsividade), `docs/api-reference.md` (papéis, visibilidade de tickets, paginação, categorias e usuários) e `components/ui/references/design-system.md` (shell, sidebar, `card-stat`, `panel-chart`, chips, breakpoints). Parâmetros de `GET /tickets` conferidos no Swagger (`/docs-json`): `page`, `limit` (máx. 50), `status`, `priority`.
- **Endpoints da API usados (só leitura):** `GET /users/me`, `GET /tickets`, `GET /users`, `GET /categories`.
- **Código:** nova route group `app/(app)/` com o layout autenticado; `app/dashboard` move para dentro dela (a URL continua `/dashboard`); novas páginas stub; `lib/api/` ganha `tickets.ts`, `categories.ts` e listagem de usuários; `lib/auth/routes.ts` ganha as novas rotas protegidas; `lib/navigation` (configuração da navegação por papel); componentes da shell e do painel em `components/`.
- **Design tokens:** `app/globals.css` ganha os tokens `storm` e a paleta de gráficos do design system, hoje ausentes.
- **Dependências:** nenhuma biblioteca de gráficos; donut e barras em SVG renderizado no servidor. Drawer com o componente `sheet` do shadcn (sobre `@base-ui/react`, já instalado).
- **Testes:** os E2E existentes que procuram o "Sair" no top bar precisam ser atualizados.
