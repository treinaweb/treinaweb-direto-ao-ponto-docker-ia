# Spec Delta

## Purpose

Administração de usuários do TreinaDesk pelo `ADMIN`: lista paginada de todos os usuários, cadastro de atendentes e administradores e mudança de papel, com validações em pt-BR, confirmações e tratamento dos erros da API. Não inclui edição de dados nem exclusão, que a API não oferece.

## ADDED Requirements

### Requirement: Acesso exclusivo do administrador
O sistema MUST verificar no servidor que o usuário é `ADMIN` antes de exibir `/usuarios` e `/usuarios/novo`. Para os demais papéis, MUST exibir a página "não encontrado", sem revelar que a página existe e sem chamar a API de usuários.

#### Scenario: Atendente tenta abrir a lista de usuários
- **WHEN** um `SUPPORT` acessa `/usuarios` digitando a URL
- **THEN** o sistema exibe a página "não encontrado" e não chama `GET /users`

#### Scenario: Cliente tenta abrir o cadastro de equipe
- **WHEN** um `CUSTOMER` acessa `/usuarios/novo`
- **THEN** o sistema exibe a página "não encontrado" e o breadcrumb não mostra "Usuários" nem "Novo usuário"

### Requirement: Lista de usuários
O sistema SHALL exibir ao `ADMIN` em `/usuarios` a página "Usuários" com todos os usuários devolvidos pela API, na ordem da API (cadastrados há mais tempo primeiro), e o botão "Novo usuário", que leva a `/usuarios/novo`. Cada usuário MUST mostrar nome, e-mail, papel em texto ("Cliente", "Atendente" ou "Administrador") e data de cadastro.

#### Scenario: Administrador abre a lista
- **WHEN** um `ADMIN` clica em "Usuários" na sidebar
- **THEN** a página mostra o título "Usuários", o botão "Novo usuário" e os usuários com nome, e-mail, papel e data de cadastro, do mais antigo para o mais recente

#### Scenario: Papel em texto
- **WHEN** a lista inclui um usuário `SUPPORT`
- **THEN** a linha dele mostra o papel "Atendente" em texto, nunca só com cor ou ícone

### Requirement: Somente as ações que a API oferece
A lista MUST NOT oferecer editar nome, e-mail ou senha, excluir, desativar, buscar ou filtrar usuários, porque a API não oferece essas operações. As únicas ações SHALL ser "Novo usuário" e "Mudar papel".

#### Scenario: Linha sem ações de edição
- **WHEN** o `ADMIN` vê a linha de outro usuário
- **THEN** a única ação da linha é "Mudar papel", sem opções de editar, excluir ou desativar

#### Scenario: Lista sem busca
- **WHEN** o `ADMIN` abre `/usuarios`
- **THEN** a página não exibe campo de busca nem filtro por papel

### Requirement: Paginação da lista de usuários
O sistema SHALL exibir 25 usuários por página, o total de usuários (por exemplo "490 usuários") e, quando houver mais de uma página, os controles "Anterior" e "Próxima" e o texto "Página X de Y". A página MUST ficar na URL (`page`), com a página 1 implícita, e os controles indisponíveis nos limites.

#### Scenario: Ir para a próxima página
- **WHEN** há 60 usuários e o `ADMIN` aciona "Próxima" na página 1
- **THEN** o sistema abre `/usuarios?page=2` e mostra "Página 2 de 3"

#### Scenario: Limites da paginação
- **WHEN** o `ADMIN` está na primeira página
- **THEN** "Anterior" fica indisponível; na última página, "Próxima" fica indisponível

#### Scenario: Voltar no navegador
- **WHEN** o `ADMIN` vai para a página 2 e usa o botão voltar do navegador
- **THEN** a lista volta à página 1

### Requirement: Página inválida na URL
O sistema MUST validar o parâmetro `page` no servidor e SHALL exibir a página 1 quando ele não for um inteiro maior ou igual a 1, sem mensagem de erro e sem enviar o valor inválido à API.

#### Scenario: Página não numérica ou negativa
- **WHEN** o `ADMIN` acessa `/usuarios?page=abc` ou `/usuarios?page=-1`
- **THEN** a lista é exibida na página 1

### Requirement: Página além do total de usuários
Quando a página pedida for maior que o número de páginas existentes, o sistema SHALL exibir a mensagem "Esta página não tem usuários." e o link "Ir para a primeira página", que leva a `/usuarios`.

#### Scenario: Página inexistente
- **WHEN** há 60 usuários e o `ADMIN` acessa `/usuarios?page=9`
- **THEN** a página mostra "Esta página não tem usuários." e o link "Ir para a primeira página"

### Requirement: Carregamento da lista de usuários
Enquanto a lista carrega, o sistema SHALL manter visíveis o título "Usuários" e o botão "Novo usuário" e exibir um esqueleto no lugar dos usuários.

#### Scenario: Troca de página em andamento
- **WHEN** o `ADMIN` aciona "Próxima" e a API ainda não respondeu
- **THEN** o título e o botão "Novo usuário" continuam na tela e a área da lista mostra o esqueleto de carregamento

### Requirement: Falha ao carregar os usuários
Se `GET /users` falhar por rede, 5xx ou qualquer erro diferente de 401, o sistema SHALL exibir no lugar da lista "Não foi possível carregar os usuários." e a opção "Tentar novamente", mantendo título e botão. Em 401, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.". Nenhum texto da API MUST ser exibido.

#### Scenario: API fora do ar
- **WHEN** o `ADMIN` abre `/usuarios` e a API não responde
- **THEN** a página mostra "Não foi possível carregar os usuários." e "Tentar novamente"

#### Scenario: Papel retirado durante a sessão
- **WHEN** `GET /users` responde 403
- **THEN** a página mostra "Não foi possível carregar os usuários." sem exibir a mensagem da API

#### Scenario: Sessão expirada na lista
- **WHEN** `GET /users` responde 401
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente."

### Requirement: Lista de usuários responsiva
A lista MUST ser responsiva (mobile-first), sem scroll horizontal da página em 360px, inclusive com e-mails longos. Abaixo de `md`, cada usuário SHALL ser um card com nome, e-mail, papel, data e a ação. A partir de `md`, SHALL ser uma linha em colunas sob um cabeçalho (Nome, E-mail, Papel, Cadastrado em). Botões e controles MUST ter pelo menos 44px e seguir os temas claro e escuro.

#### Scenario: Lista no mobile
- **WHEN** a lista é aberta em 360px de largura
- **THEN** cada usuário aparece como card, o botão "Mudar papel" tem pelo menos 44px de altura e não há scroll horizontal

#### Scenario: Lista no desktop
- **WHEN** a lista é aberta em 1280px de largura
- **THEN** os usuários aparecem em linhas com colunas alinhadas sob o cabeçalho Nome, E-mail, Papel e Cadastrado em

### Requirement: Formulário de cadastro de equipe
O sistema SHALL exibir em `/usuarios/novo` o formulário "Novo usuário" com os campos "Nome", "E-mail", "Senha" e "Papel", o botão "Cadastrar usuário" e o link "Cancelar", que volta para `/usuarios`. O papel SHALL oferecer só "Atendente" e "Administrador", começando sem seleção, e a página MUST informar que clientes criam a própria conta pelo cadastro público.

#### Scenario: Administrador abre o cadastro
- **WHEN** o `ADMIN` aciona "Novo usuário" na lista
- **THEN** o sistema exibe `/usuarios/novo` com os quatro campos, o papel sem seleção, o texto sobre o cadastro público de clientes e os botões "Cadastrar usuário" e "Cancelar"

#### Scenario: Papel de cliente não é oferecido
- **WHEN** o `ADMIN` abre o campo "Papel"
- **THEN** as opções são apenas "Atendente" e "Administrador"

### Requirement: Validação do cadastro de equipe
O sistema MUST validar no servidor, antes de chamar a API: nome com 2 a 100 caracteres após o trim; e-mail obrigatório, com formato válido e até 200 caracteres, normalizado para minúsculas e sem espaços nas extremidades; senha com 8 a 128 caracteres; papel `SUPPORT` ou `ADMIN`. As mensagens pt-BR SHALL aparecer junto a cada campo e, com algum campo inválido, a API MUST NOT ser chamada.

#### Scenario: Nome curto demais
- **WHEN** o `ADMIN` informa o nome "A"
- **THEN** o campo "Nome" mostra "O nome deve ter entre 2 e 100 caracteres." e nenhum usuário é criado

#### Scenario: E-mail inválido
- **WHEN** o `ADMIN` informa `bruno.teste.com` como e-mail
- **THEN** o campo "E-mail" mostra "Informe um e-mail válido."

#### Scenario: Senha curta demais
- **WHEN** o `ADMIN` informa uma senha com 7 caracteres
- **THEN** o campo "Senha" mostra "A senha deve ter entre 8 e 128 caracteres."

#### Scenario: Papel não escolhido ou fora das opções
- **WHEN** o formulário é enviado sem papel ou com o papel `CUSTOMER`
- **THEN** o campo "Papel" mostra "Selecione o papel." e a API não é chamada

#### Scenario: E-mail normalizado
- **WHEN** o `ADMIN` informa `  Bruno@Teste.COM ` como e-mail
- **THEN** o sistema envia `bruno@teste.com` à API

### Requirement: Valores preservados no cadastro de equipe
Depois de qualquer erro de validação ou da API, o sistema SHALL manter preenchidos nome, e-mail e papel. A senha MUST NOT ser devolvida ao navegador e o campo "Senha" SHALL voltar vazio.

#### Scenario: Erro com o formulário preenchido
- **WHEN** o `ADMIN` preenche os quatro campos e o envio falha porque o nome é curto
- **THEN** o formulário volta com o e-mail e o papel preenchidos, o nome marcado com erro e o campo "Senha" vazio

### Requirement: E-mail já cadastrado no cadastro de equipe
Se a API responder 409, o sistema SHALL exibir "Este e-mail já está cadastrado." no campo "E-mail", sem criar usuário e preservando os valores conforme as regras do formulário.

#### Scenario: Cadastro com e-mail existente
- **WHEN** o `ADMIN` cadastra um e-mail que já existe e a API responde 409
- **THEN** o campo "E-mail" mostra "Este e-mail já está cadastrado." e nome, e-mail e papel continuam preenchidos

### Requirement: Erros da API no cadastro de equipe
O sistema SHALL tratar as demais respostas de `POST /users/staff` sem exibir texto da API: 400 mostra as mensagens pt-BR nos campos correspondentes, ou "Verifique os dados informados." quando não for possível associá-las; 403 mostra "Você não tem permissão para esta ação."; rede ou 5xx mostra "Não foi possível conectar ao servidor. Tente novamente em instantes.".

#### Scenario: Validação recusada pela API
- **WHEN** a API responde 400 com `email must be an email`
- **THEN** o campo "E-mail" mostra "Informe um e-mail válido."

#### Scenario: Administrador rebaixado durante a sessão
- **WHEN** a API responde 403 ao cadastro
- **THEN** o formulário mostra "Você não tem permissão para esta ação." e mantém nome, e-mail e papel

#### Scenario: API indisponível no cadastro
- **WHEN** a API não responde ao cadastro
- **THEN** o formulário mostra "Não foi possível conectar ao servidor. Tente novamente em instantes."

### Requirement: Envio único do cadastro de equipe
Enquanto o cadastro estiver em andamento, o botão SHALL ficar desabilitado com o texto "Cadastrando...", impedindo um segundo envio, e o estado de envio MUST ser anunciado a leitores de tela. As mensagens de erro MUST ficar associadas aos campos de forma acessível.

#### Scenario: Duplo clique em Cadastrar usuário
- **WHEN** o `ADMIN` clica duas vezes seguidas em "Cadastrar usuário"
- **THEN** apenas um usuário é criado

### Requirement: Confirmação após cadastrar
Quando a API criar o usuário, o sistema SHALL levar o `ADMIN` à última página da lista, calculada pelo total de usuários lido depois do cadastro, com o aviso "Usuário cadastrado." anunciado a leitores de tela, e o usuário novo SHALL aparecer nessa página. Se o total não puder ser lido, SHALL levar a `/usuarios` com o mesmo aviso.

#### Scenario: Atendente cadastrado
- **WHEN** o `ADMIN` cadastra um atendente com dados válidos e a API responde 201
- **THEN** o sistema exibe a última página de `/usuarios` com o aviso "Usuário cadastrado." e o novo usuário aparece nela com o papel "Atendente"

#### Scenario: Total indisponível depois do cadastro
- **WHEN** o usuário é criado, mas a leitura do total de usuários falha
- **THEN** o sistema exibe `/usuarios` com o aviso "Usuário cadastrado." e não tenta cadastrar de novo

#### Scenario: Aviso não é injetável
- **WHEN** alguém acessa `/usuarios` com um código de aviso desconhecido na URL
- **THEN** nenhum aviso é exibido e nenhum texto da URL é renderizado

### Requirement: Formulário de cadastro de equipe responsivo
O formulário MUST ser responsivo (mobile-first), em uma coluna no mobile, sem scroll horizontal em 360px, com campos e botões de pelo menos 44px de altura, e seguir os temas claro e escuro.

#### Scenario: Cadastro no mobile
- **WHEN** `/usuarios/novo` é aberto em 360px de largura
- **THEN** os campos ficam em uma coluna, os botões têm pelo menos 44px de altura e não há scroll horizontal

#### Scenario: Cadastro no desktop
- **WHEN** `/usuarios/novo` é aberto em 1280px de largura
- **THEN** o formulário ocupa um painel de largura limitada dentro da área de trabalho, seguindo os tokens do design system

### Requirement: Ação de mudar papel
Cada linha da lista SHALL ter o botão "Mudar papel", com nome acessível que identifica o usuário (por exemplo "Mudar papel de Bruno"), exceto a linha do próprio administrador logado, que MUST NOT ter a ação e SHALL mostrar a indicação "Você".

#### Scenario: Linha de outro usuário
- **WHEN** o `ADMIN` vê na lista o atendente Bruno
- **THEN** a linha de Bruno tem o botão "Mudar papel"

#### Scenario: Linha do próprio administrador
- **WHEN** o `ADMIN` encontra a própria linha na lista
- **THEN** a linha mostra "Você" e não tem o botão "Mudar papel"

### Requirement: Diálogo de mudança de papel
"Mudar papel" SHALL abrir um diálogo "Mudar papel de {nome}" com o papel atual e o campo "Novo papel", sem seleção, oferecendo só os dois papéis diferentes do atual, e os botões "Mudar papel" e "Cancelar". O diálogo MUST prender o foco, fechar com Esc ou "Cancelar" sem alterar nada e devolver o foco ao botão que o abriu.

#### Scenario: Opções para um atendente
- **WHEN** o `ADMIN` abre o diálogo de um usuário "Atendente"
- **THEN** o campo "Novo papel" oferece apenas "Cliente" e "Administrador", e o diálogo mostra "Papel atual: Atendente"

#### Scenario: Cancelar
- **WHEN** o `ADMIN` abre o diálogo e aciona "Cancelar" ou pressiona Esc
- **THEN** o diálogo fecha, nenhum papel muda e o foco volta ao botão "Mudar papel" da linha

#### Scenario: Confirmar sem escolher
- **WHEN** o `ADMIN` aciona "Mudar papel" no diálogo sem escolher o novo papel
- **THEN** o diálogo mostra "Selecione o novo papel." e a API não é chamada

### Requirement: Aviso ao rebaixar para cliente
Quando o usuário for `SUPPORT` ou `ADMIN` e o novo papel escolhido for "Cliente", o diálogo SHALL exibir o aviso "Chamados atribuídos a {nome} continuam atribuídos a essa pessoa. Reatribua-os pelo detalhe do chamado.", sem consultar os chamados do usuário.

#### Scenario: Rebaixar um atendente
- **WHEN** o `ADMIN` escolhe "Cliente" no diálogo do atendente Bruno
- **THEN** o diálogo mostra "Chamados atribuídos a Bruno continuam atribuídos a essa pessoa. Reatribua-os pelo detalhe do chamado."

#### Scenario: Promoção sem aviso
- **WHEN** o `ADMIN` escolhe "Atendente" no diálogo de um cliente
- **THEN** o diálogo não mostra o aviso sobre chamados atribuídos

### Requirement: Papel alterado
Quando a API aceitar a mudança, o sistema SHALL fechar o diálogo, atualizar a lista na mesma página com o novo papel e exibir "Papel alterado.", anunciado a leitores de tela.

#### Scenario: Promover um cliente a atendente
- **WHEN** o `ADMIN` escolhe "Atendente" para um cliente e confirma
- **THEN** o diálogo fecha, a linha passa a mostrar "Atendente", a página continua a mesma e a mensagem "Papel alterado." é exibida

### Requirement: Envio único da mudança de papel
Enquanto a mudança estiver em andamento, o botão de confirmação SHALL ficar desabilitado com o texto "Alterando...", impedindo um segundo envio.

#### Scenario: Duplo clique na confirmação
- **WHEN** o `ADMIN` clica duas vezes seguidas em "Mudar papel" no diálogo
- **THEN** apenas uma requisição de mudança de papel é feita

### Requirement: Erros na mudança de papel
O sistema MUST validar no servidor o identificador (UUID) e o papel antes de chamar a API e SHALL tratar `PATCH /users/{id}/role` sem exibir texto da API: 404 fecha o diálogo, atualiza a lista e mostra "Este usuário não foi encontrado. A lista foi atualizada."; 422 mostra "Não é permitido alterar o próprio papel." quando for o caso, ou "Não foi possível concluir a ação."; 403, 400, rede e 5xx seguem as mensagens padrão.

#### Scenario: Usuário não encontrado
- **WHEN** o `ADMIN` confirma a mudança e a API responde 404
- **THEN** o diálogo fecha, a lista é recarregada e a página mostra "Este usuário não foi encontrado. A lista foi atualizada."

#### Scenario: Tentativa de mudar o próprio papel
- **WHEN** um envio forjado tenta mudar o papel do próprio administrador e a API responde 422
- **THEN** o diálogo mostra "Não é permitido alterar o próprio papel." e nenhum papel muda

#### Scenario: Dados inválidos no envio
- **WHEN** o envio chega com um identificador que não é UUID ou um papel fora do enum
- **THEN** o sistema mostra "Verifique os dados informados." sem chamar a API

#### Scenario: Sem permissão
- **WHEN** a API responde 403 à mudança de papel
- **THEN** o diálogo mostra "Você não tem permissão para esta ação."

#### Scenario: API indisponível na mudança
- **WHEN** a API não responde à mudança de papel
- **THEN** o diálogo continua aberto com a escolha feita e mostra "Não foi possível conectar ao servidor. Tente novamente em instantes."

### Requirement: Sessão expirada nas ações de usuários
Se `POST /users/staff` ou `PATCH /users/{id}/role` responder 401, o sistema MUST renovar a sessão uma única vez e repetir a requisição uma única vez. Se a renovação falhar, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente." sem concluir a ação.

#### Scenario: Access token expirado no cadastro
- **WHEN** o cadastro recebe 401 e o refresh token ainda é válido
- **THEN** o sistema renova a sessão, repete o envio uma única vez e o usuário é criado

#### Scenario: Renovação recusada na mudança de papel
- **WHEN** a mudança de papel recebe 401 e a renovação também falha
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente." e o papel não muda
