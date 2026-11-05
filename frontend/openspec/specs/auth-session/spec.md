# auth-session Specification

## Purpose

Gerencia o ciclo de vida da sessão do usuário no frontend do TreinaDesk: entrar com e-mail e senha, manter a sessão ativa renovando os tokens com segurança, proteger as rotas autenticadas, identificar o usuário logado e sair.

## Requirements

### Requirement: Entrar com e-mail e senha
O sistema SHALL oferecer em `/login` um formulário com os campos "E-mail" e "Senha" que, ao ser enviado com credenciais válidas, autentica o usuário na API e o redireciona para a área autenticada.

#### Scenario: Login com credenciais válidas
- **WHEN** o visitante informa e-mail e senha de uma conta existente e envia o formulário
- **THEN** o sistema autentica o usuário e o redireciona para `/dashboard`

#### Scenario: Login com destino solicitado
- **WHEN** o visitante chega em `/login?next=/dashboard` e entra com credenciais válidas
- **THEN** o sistema o redireciona para `/dashboard`

#### Scenario: Destino externo é ignorado
- **WHEN** o parâmetro `next` não é um caminho interno da aplicação (por exemplo `https://exemplo.com` ou `//exemplo.com`)
- **THEN** o sistema ignora o parâmetro e redireciona para `/dashboard`

### Requirement: Validação do formulário de login
O sistema MUST validar os campos do login no servidor antes de chamar a API, exibindo as mensagens em pt-BR junto a cada campo e preservando o e-mail digitado. O e-mail MUST ser obrigatório e ter formato válido; a senha MUST ser obrigatória e ter no máximo 128 caracteres.

#### Scenario: Campos vazios
- **WHEN** o visitante envia o formulário com e-mail e senha vazios
- **THEN** o sistema exibe "Informe seu e-mail." e "Informe sua senha." nos respectivos campos e não chama a API

#### Scenario: E-mail com formato inválido
- **WHEN** o visitante informa `ana@` como e-mail
- **THEN** o sistema exibe "Informe um e-mail válido." no campo e-mail e não chama a API

#### Scenario: Senha acima do limite
- **WHEN** o visitante informa uma senha com mais de 128 caracteres
- **THEN** o sistema exibe "A senha deve ter no máximo 128 caracteres." no campo senha

#### Scenario: API rejeita o corpo (400)
- **WHEN** a API responde 400 ao login
- **THEN** o sistema exibe as mensagens de validação em pt-BR no formulário, sem expor o texto original em inglês

### Requirement: Credenciais inválidas
O sistema SHALL informar, sem revelar qual campo está errado, quando a API recusar as credenciais.

#### Scenario: E-mail ou senha incorretos (401)
- **WHEN** a API responde 401 ao login
- **THEN** o sistema exibe o alerta "E-mail ou senha inválidos.", mantém o e-mail preenchido, limpa a senha e não grava nenhum cookie de sessão

### Requirement: Falha de comunicação com a API
O sistema SHALL exibir uma mensagem genérica em pt-BR quando a API estiver indisponível ou responder com erro 5xx em qualquer operação de sessão, sem exibir detalhes internos.

#### Scenario: API fora do ar no login
- **WHEN** o visitante envia o login e a API não responde ou responde 5xx
- **THEN** o sistema exibe "Não foi possível conectar ao servidor. Tente novamente em instantes." e mantém o e-mail preenchido

### Requirement: Tokens apenas em cookies httpOnly
O sistema MUST guardar o access token e o refresh token somente em cookies httpOnly (`td_access` e `td_refresh`), `sameSite=lax`, `path=/` e `secure` em produção. Os tokens e a URL da API MUST NOT chegar ao navegador por JavaScript, HTML, props ou armazenamento local, e o navegador MUST NOT chamar a API diretamente.

#### Scenario: Cookies após login
- **WHEN** o login é concluído com sucesso
- **THEN** a resposta grava `td_access` com validade igual à expiração do access token (15 min) e `td_refresh` com validade de 7 dias, ambos httpOnly

#### Scenario: Navegador não fala com a API
- **WHEN** o usuário entra, navega pelo dashboard e sai
- **THEN** nenhuma requisição do navegador é feita para a URL da API e nenhum token aparece no HTML ou no payload enviado ao cliente

### Requirement: Renovação preventiva da sessão
O sistema SHALL renovar os tokens antes de atender uma requisição quando o access token estiver ausente ou faltar menos de 60 segundos para expirar e houver refresh token, gravando o novo par de cookies e usando o token novo na mesma requisição. O refresh token MUST ter validade deslizante de 7 dias a cada renovação.

#### Scenario: Access token perto de expirar
- **WHEN** o usuário logado navega para uma página e o access token expira em menos de 60 segundos
- **THEN** o sistema renova os tokens, grava os novos cookies e a página é exibida normalmente, sem pedir login

#### Scenario: Access token já expirado com refresh válido
- **WHEN** o usuário volta após 30 minutos de inatividade com o refresh token ainda válido
- **THEN** o sistema renova a sessão e exibe a página solicitada sem pedir login

### Requirement: Renovação reativa nas ações
O sistema SHALL, quando uma ação do usuário receber 401 da API, renovar os tokens uma única vez e repetir a requisição uma única vez; se a renovação falhar, MUST encerrar a sessão local e levar ao login.

#### Scenario: Ação recebe 401 e a renovação funciona
- **WHEN** uma ação autenticada recebe 401 e a renovação dos tokens é bem-sucedida
- **THEN** o sistema repete a requisição com o novo token e conclui a ação sem intervenção do usuário

#### Scenario: Renovação falha durante uma ação
- **WHEN** uma ação recebe 401 e a renovação também responde 401
- **THEN** o sistema apaga os cookies de sessão e redireciona para `/login` com o aviso "Sua sessão expirou. Entre novamente."

### Requirement: Uma renovação por refresh token
O sistema MUST garantir que um mesmo refresh token seja enviado à API no máximo uma vez: requisições concorrentes que precisem renovar com o mesmo token MUST aguardar e reutilizar o resultado da única renovação em andamento. A renderização de páginas MUST NOT disparar renovação.

#### Scenario: Requisições simultâneas com token expirando
- **WHEN** várias requisições do mesmo usuário chegam ao mesmo tempo com o mesmo refresh token e o access token perto de expirar
- **THEN** a API recebe uma única chamada de renovação e todas as requisições seguem com o novo par de tokens, sem revogar a sessão

#### Scenario: Página recebe 401 durante a renderização
- **WHEN** a busca de dados de uma página recebe 401 da API
- **THEN** o sistema redireciona para `/login` sem tentar renovar os tokens durante a renderização

### Requirement: Sessão encerrada pela API
O sistema SHALL tratar como sessão encerrada qualquer recusa da API ao refresh token (inexistente, expirado, revogado ou reutilizado), apagando os cookies e levando ao login com aviso.

#### Scenario: Refresh token expirado ou revogado
- **WHEN** o usuário acessa uma página protegida e a renovação responde 401
- **THEN** o sistema apaga `td_access` e `td_refresh` e redireciona para `/login?next=<rota atual>` exibindo "Sua sessão expirou. Entre novamente."

#### Scenario: Sessão revogada por troca de papel
- **WHEN** um administrador altera o papel do usuário e a API revoga as sessões dele
- **THEN** na próxima navegação o usuário é levado ao login com o aviso de sessão expirada e, ao entrar de novo, vê o novo papel

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

### Requirement: Sair
O sistema SHALL encerrar a sessão quando o usuário clicar em "Sair": revoga o refresh token na API, apaga os cookies de sessão mesmo se a API falhar e redireciona para `/login` com a mensagem "Você saiu da sua conta.".

#### Scenario: Logout bem-sucedido
- **WHEN** o usuário logado clica em "Sair"
- **THEN** a API revoga o refresh token, os cookies `td_access` e `td_refresh` são apagados e o usuário vê `/login` com "Você saiu da sua conta."

#### Scenario: Logout com API indisponível ou recusando
- **WHEN** o usuário clica em "Sair" e a API responde erro (401, 5xx) ou não responde
- **THEN** o sistema apaga os cookies mesmo assim e redireciona para `/login`

#### Scenario: Sessão não sobrevive ao logout
- **WHEN** após sair o usuário usa o botão voltar do navegador para `/dashboard`
- **THEN** o sistema redireciona para `/login` e o refresh token antigo não renova mais a sessão

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

### Requirement: Estados de envio acessíveis
Os formulários de sessão SHALL indicar o envio em andamento desabilitando o botão e alterando seu texto (por exemplo "Entrando..."), e MUST associar as mensagens de erro aos campos de forma acessível a leitores de tela.

#### Scenario: Duplo clique no Entrar
- **WHEN** o visitante clica duas vezes rapidamente em "Entrar"
- **THEN** o botão fica desabilitado durante o envio e apenas uma tentativa de login é feita
