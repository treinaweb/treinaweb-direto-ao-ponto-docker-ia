# app-shell Specification

## Purpose

Moldura comum de todas as páginas autenticadas do TreinaDesk: layout com sidebar e área de trabalho, navegação que muda conforme o papel do usuário, comportamento responsivo e bloqueio no servidor das páginas que o papel não pode acessar.

## Requirements

### Requirement: Layout único das páginas autenticadas
O sistema SHALL exibir todas as páginas autenticadas (`/dashboard`, `/chamados` e subrotas, `/categorias`, `/usuarios`) dentro do mesmo layout: uma sidebar com a marca TreinaDesk, a navegação e a área do usuário, e uma área de trabalho com top bar e conteúdo da página. As telas `/login` e `/cadastro` MUST NOT usar esse layout.

#### Scenario: Navegação entre páginas mantém a moldura
- **WHEN** o usuário logado vai do `/dashboard` para `/chamados` pela sidebar
- **THEN** a sidebar e o top bar continuam visíveis e só o conteúdo da área de trabalho muda

#### Scenario: Telas de entrada sem a moldura
- **WHEN** um visitante abre `/login` ou `/cadastro`
- **THEN** a página não exibe a sidebar nem o top bar da área autenticada

### Requirement: Navegação do cliente
O sistema SHALL exibir ao usuário `CUSTOMER` os itens "Painel" (`/dashboard`) e "Meus chamados" (`/chamados`), e um botão de destaque "Abrir chamado" que leva a `/chamados/novo`.

#### Scenario: Cliente vê seus itens
- **WHEN** um usuário `CUSTOMER` abre qualquer página autenticada
- **THEN** a sidebar mostra "Painel", "Meus chamados" e o botão "Abrir chamado", e não mostra "Categorias" nem "Usuários"

#### Scenario: Cliente aciona Abrir chamado
- **WHEN** o cliente clica em "Abrir chamado"
- **THEN** o sistema navega para `/chamados/novo`

### Requirement: Navegação do atendente
O sistema SHALL exibir ao usuário `SUPPORT` os itens "Painel" (`/dashboard`) e "Chamados" (`/chamados`), sem o botão "Abrir chamado" e sem o grupo de administração.

#### Scenario: Atendente vê seus itens
- **WHEN** um usuário `SUPPORT` abre qualquer página autenticada
- **THEN** a sidebar mostra apenas "Painel" e "Chamados"

### Requirement: Navegação do administrador
O sistema SHALL exibir ao usuário `ADMIN` os itens "Painel" e "Chamados" e, em um grupo rotulado "Administração", os itens "Categorias" (`/categorias`) e "Usuários" (`/usuarios`). O botão "Abrir chamado" MUST NOT aparecer para o administrador.

#### Scenario: Administrador vê o grupo Administração
- **WHEN** um usuário `ADMIN` abre qualquer página autenticada
- **THEN** a sidebar mostra "Painel", "Chamados" e o grupo "Administração" com "Categorias" e "Usuários"

### Requirement: Navegação a partir do papel atual
O sistema SHALL montar a navegação a partir do papel retornado pela API para o usuário da sessão, sem confiar em dados vindos do navegador.

#### Scenario: Papel alterado por um administrador
- **WHEN** o papel de um usuário é alterado de `CUSTOMER` para `SUPPORT` e ele entra novamente
- **THEN** a sidebar passa a mostrar a navegação do atendente

### Requirement: Item ativo da navegação
O sistema SHALL destacar o item da navegação correspondente à página atual, com indicação visual e `aria-current="page"`. Subrotas MUST destacar o item pai (por exemplo, `/chamados/novo` destaca "Meus chamados" ou "Chamados").

#### Scenario: Página atual destacada
- **WHEN** o usuário está em `/dashboard`
- **THEN** o item "Painel" aparece destacado e é o único item com `aria-current="page"`

#### Scenario: Subrota destaca o item pai
- **WHEN** o usuário está em `/chamados?status=OPEN`
- **THEN** o item de chamados aparece destacado

### Requirement: Acesso às páginas por papel
O sistema MUST verificar no servidor o papel do usuário antes de exibir uma página restrita e, se o papel não tiver acesso, MUST responder com a página "não encontrado" em pt-BR, sem revelar que a página existe. `/categorias` e `/usuarios` são exclusivas de `ADMIN`; `/chamados/novo` é exclusiva de `CUSTOMER`; `/dashboard` e `/chamados` são de todos os papéis.

#### Scenario: Cliente tenta abrir a página de usuários
- **WHEN** um usuário `CUSTOMER` acessa `/usuarios` digitando a URL
- **THEN** o sistema exibe a página "não encontrado" e não chama a API de usuários

#### Scenario: Atendente tenta abrir a página de categorias
- **WHEN** um usuário `SUPPORT` acessa `/categorias`
- **THEN** o sistema exibe a página "não encontrado"

#### Scenario: Atendente tenta abrir chamado
- **WHEN** um usuário `SUPPORT` ou `ADMIN` acessa `/chamados/novo`
- **THEN** o sistema exibe a página "não encontrado"

#### Scenario: Administrador acessa a administração
- **WHEN** um usuário `ADMIN` acessa `/categorias` ou `/usuarios`
- **THEN** o sistema exibe a página dentro do layout autenticado

### Requirement: Top bar com localização
O top bar SHALL exibir a localização atual em forma de breadcrumb ("Painel", "Painel / {página}" ou, em `/usuarios/novo`, "Painel / Usuários / Novo usuário"), com o item atual destacado e `aria-current="page"` e os níveis anteriores como links. No mobile, o breadcrumb MUST mostrar só a página atual.

#### Scenario: Breadcrumb em subpágina
- **WHEN** o administrador está em `/categorias` em uma tela de 1280px
- **THEN** o top bar mostra "Painel / Categorias", com "Painel" como link para `/dashboard`

#### Scenario: Breadcrumb com três níveis
- **WHEN** o administrador está em `/usuarios/novo` em uma tela de 1280px
- **THEN** o top bar mostra "Painel / Usuários / Novo usuário", com "Painel" como link para `/dashboard`, "Usuários" como link para `/usuarios` e "Novo usuário" com `aria-current="page"`

#### Scenario: Breadcrumb no mobile
- **WHEN** o administrador está em `/categorias` em uma tela de 360px
- **THEN** o top bar mostra apenas "Categorias"

#### Scenario: Breadcrumb de três níveis no mobile
- **WHEN** o administrador está em `/usuarios/novo` em uma tela de 360px
- **THEN** o top bar mostra apenas "Novo usuário"

### Requirement: Sidebar responsiva
A sidebar MUST ficar fixa e completa (ícone e rótulo) a partir de 1024px, virar uma coluna só de ícones entre 768px e 1023px (cada ícone com nome acessível e rótulo visível ao receber foco ou toque) e, abaixo de 768px, ficar oculta atrás de um botão "Abrir menu" no top bar que abre a navegação em um painel sobreposto (drawer).

#### Scenario: Desktop
- **WHEN** a página autenticada é aberta em 1280px
- **THEN** a sidebar aparece fixa à esquerda com ícones e rótulos

#### Scenario: Tablet
- **WHEN** a página autenticada é aberta em 800px
- **THEN** a sidebar mostra só os ícones, e cada item continua acessível por nome em leitores de tela

#### Scenario: Mobile
- **WHEN** a página autenticada é aberta em 360px
- **THEN** a sidebar não aparece, o top bar mostra o botão "Abrir menu" e não há scroll horizontal

### Requirement: Drawer de navegação acessível
O drawer do mobile MUST prender o foco enquanto aberto, fechar com a tecla Esc, com o botão "Fechar menu", com toque fora dele e ao navegar para outra página, e devolver o foco ao botão "Abrir menu" ao fechar. Todos os alvos de toque MUST ter pelo menos 44px.

#### Scenario: Abrir e navegar pelo drawer
- **WHEN** o usuário no mobile toca em "Abrir menu" e escolhe "Meus chamados"
- **THEN** o drawer fecha e a página `/chamados` é exibida

#### Scenario: Fechar com Esc
- **WHEN** o drawer está aberto e o usuário pressiona Esc
- **THEN** o drawer fecha e o foco volta ao botão "Abrir menu"

### Requirement: Temas claro e escuro na moldura
A moldura MUST seguir o tema claro ou escuro do sistema operacional, usando os tokens do design system (canvas branco e painéis `cloud` no claro; canvas `ink-soft` e painéis `charcoal` no escuro), com o item ativo marcado pelo indicador `primary`.

#### Scenario: Sistema em modo escuro
- **WHEN** o sistema operacional do usuário está em modo escuro
- **THEN** a sidebar, o top bar e o conteúdo usam as cores do tema escuro, com texto legível

### Requirement: Falha ao identificar o usuário
O sistema SHALL exibir uma página de erro em pt-BR, com a opção "Tentar novamente", quando não conseguir obter o usuário logado por indisponibilidade da API (rede ou 5xx), sem exibir detalhes internos. Uma recusa da sessão (401) MUST seguir as regras da capability `auth-session`.

#### Scenario: API fora do ar ao abrir uma página autenticada
- **WHEN** o usuário com sessão abre `/dashboard` e `GET /users/me` falha por rede ou 5xx
- **THEN** o sistema exibe "Algo deu errado" e "Não foi possível carregar esta página. Tente novamente em instantes.", com o botão "Tentar novamente"
