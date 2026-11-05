# Spec Delta

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Páginas em construção
**Reason**: Com `/usuarios` construída por esta change (e `/categorias` por `add-category-admin`, arquivada antes), nenhuma página autenticada continua em construção, e o texto "Esta página estará disponível em breve." deixa de existir.
**Migration**: O conteúdo de `/usuarios` e `/usuarios/novo` passa a ser descrito pela capability `user-admin`. O cenário "Identificador de chamado inválido" (`/chamados/abc` → "não encontrado") já é coberto pelo requisito "Chamado não encontrado" da capability `ticket-detail`, que exige "Chamado não encontrado." sem chamar a API, então nenhum comportamento se perde. Os testes que esperavam a página "em breve" passam a conferir as páginas reais.
