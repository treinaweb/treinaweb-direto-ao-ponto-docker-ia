# Spec Delta

## MODIFIED Requirements

### Requirement: Proteção de rotas
O sistema SHALL exigir sessão para as rotas autenticadas (`/dashboard`, `/chamados`, `/categorias`, `/usuarios` e suas subrotas) e SHALL afastar usuários já logados das telas de entrada e cadastro. A raiz `/` MUST encaminhar para `/dashboard` com sessão e para `/login` sem sessão.

#### Scenario: Visitante sem sessão em rota protegida
- **WHEN** um visitante sem cookies de sessão acessa `/dashboard`
- **THEN** o sistema redireciona para `/login?next=/dashboard`

#### Scenario: Visitante sem sessão em subrota protegida
- **WHEN** um visitante sem cookies de sessão acessa `/chamados?status=OPEN`
- **THEN** o sistema redireciona para `/login` com `next` igual a `/chamados?status=OPEN` e, após entrar, leva o usuário de volta a essa página

#### Scenario: Usuário logado acessa login ou cadastro
- **WHEN** um usuário com sessão ativa acessa `/login` ou `/cadastro`
- **THEN** o sistema redireciona para `/dashboard`

#### Scenario: Acesso à raiz
- **WHEN** alguém acessa `/`
- **THEN** o sistema redireciona para `/dashboard` se houver sessão, ou para `/login` se não houver

#### Scenario: Ação protegida sem sessão
- **WHEN** uma ação que exige sessão é executada sem cookies válidos
- **THEN** o sistema não chama a API em nome do usuário e redireciona para `/login`

### Requirement: Usuário logado no dashboard
O sistema SHALL exibir em `/dashboard` a saudação "Olá, {nome}" e, na área do usuário da sidebar de todas as páginas autenticadas, o nome, o papel do usuário logado em pt-BR ("Cliente", "Atendente" ou "Administrador") e o botão "Sair", todos obtidos da API. Ao cliente MUST ser enviado apenas nome e papel, nunca tokens ou o objeto bruto da sessão.

#### Scenario: Cliente logado vê seus dados
- **WHEN** um usuário `CUSTOMER` chamado Ana acessa `/dashboard`
- **THEN** a página exibe "Olá, Ana" e a sidebar mostra "Ana", o papel "Cliente" e o botão "Sair"

#### Scenario: Papel de equipe
- **WHEN** um usuário `SUPPORT` acessa `/dashboard`
- **THEN** a sidebar exibe o papel "Atendente"

### Requirement: Telas de sessão responsivas
As telas `/login` e `/dashboard` MUST ser responsivas (mobile-first), sem scroll horizontal em 360px, com formulário em uma coluna no mobile, alvos de toque de pelo menos 44px e suporte aos temas claro e escuro do design system.

#### Scenario: Login no mobile
- **WHEN** a tela `/login` é aberta em uma viewport de 360px de largura
- **THEN** o formulário ocupa uma coluna, os campos e o botão "Entrar" têm altura mínima de 44px e não há scroll horizontal

#### Scenario: Login no desktop
- **WHEN** a tela `/login` é aberta em uma viewport de 1280px ou mais
- **THEN** o formulário aparece centralizado em um painel com largura limitada, seguindo os tokens do design system

#### Scenario: Top bar do dashboard no mobile
- **WHEN** o `/dashboard` é aberto em 360px de largura
- **THEN** o top bar mostra o botão "Abrir menu", e o drawer aberto por ele exibe a área do usuário com o botão "Sair" acessível por toque, sem scroll horizontal
