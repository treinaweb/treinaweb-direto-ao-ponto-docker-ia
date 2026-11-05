# Spec Delta

## Purpose

Abertura de chamado pelo cliente no TreinaDesk: formulário com título, descrição, prioridade e categoria, validações em pt-BR, envio único, confirmação e tratamento dos erros da API.

## ADDED Requirements

### Requirement: Formulário de abertura de chamado
O sistema SHALL exibir ao `CUSTOMER` em `/chamados/novo` um formulário "Abrir chamado" com os campos "Título", "Descrição", "Prioridade" e "Categoria", o botão "Abrir chamado" e o link "Cancelar", que volta para `/chamados`. A prioridade SHALL oferecer Baixa, Média, Alta e Urgente, com "Média" pré-selecionada. A descrição SHALL aceitar várias linhas.

#### Scenario: Cliente abre o formulário
- **WHEN** um `CUSTOMER` aciona "Abrir chamado" na sidebar
- **THEN** o sistema exibe `/chamados/novo` com os quatro campos, a prioridade "Média" selecionada e os botões "Abrir chamado" e "Cancelar"

#### Scenario: Equipe não abre chamados
- **WHEN** um `SUPPORT` ou `ADMIN` acessa `/chamados/novo`
- **THEN** o sistema exibe a página "não encontrado" e não chama a API de categorias

### Requirement: Categorias disponíveis
O campo "Categoria" SHALL listar as categorias ativas devolvidas pela API, em ordem alfabética, começando sem seleção ("Selecione uma categoria").

#### Scenario: Lista de categorias
- **WHEN** o cliente abre o formulário e existem as categorias ativas "Hardware" e "Acesso"
- **THEN** o campo "Categoria" oferece "Acesso" e "Hardware", nessa ordem, sem nenhuma selecionada

### Requirement: Sem categorias disponíveis
Se a API não devolver nenhuma categoria ativa, o sistema SHALL exibir no lugar do formulário a mensagem "Ainda não há categorias disponíveis para abrir chamados. Tente novamente mais tarde." e o link "Voltar aos chamados".

#### Scenario: Nenhuma categoria ativa
- **WHEN** o cliente acessa `/chamados/novo` e `GET /categories` devolve uma lista vazia
- **THEN** a página mostra a mensagem de categorias indisponíveis e não exibe o formulário

### Requirement: Falha ao carregar as categorias
Se a API falhar ao listar as categorias (rede, 5xx ou erro diferente de 401), o sistema SHALL exibir "Não foi possível carregar o formulário." e a opção "Tentar novamente", sem exibir o formulário. Em 401, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: API fora do ar ao abrir o formulário
- **WHEN** o cliente acessa `/chamados/novo` e `GET /categories` não responde
- **THEN** a página mostra "Não foi possível carregar o formulário." e "Tentar novamente"

### Requirement: Validação da abertura de chamado
O sistema MUST validar os campos no servidor antes de chamar a API, após remover os espaços das extremidades, e SHALL exibir as mensagens junto aos campos: "O título deve ter entre 5 e 120 caracteres.", "A descrição deve ter entre 10 e 5000 caracteres.", "Selecione a prioridade." e "Selecione uma categoria.". Com algum campo inválido, a API MUST NOT ser chamada.

#### Scenario: Título curto
- **WHEN** o cliente envia o título "Erro" e os demais campos válidos
- **THEN** o campo "Título" mostra "O título deve ter entre 5 e 120 caracteres." e nenhum chamado é criado

#### Scenario: Descrição só com espaços
- **WHEN** o cliente envia uma descrição com apenas espaços
- **THEN** o campo "Descrição" mostra "A descrição deve ter entre 10 e 5000 caracteres."

#### Scenario: Categoria não escolhida
- **WHEN** o cliente envia o formulário sem escolher categoria
- **THEN** o campo "Categoria" mostra "Selecione uma categoria."

#### Scenario: Valor fora das opções
- **WHEN** o formulário é enviado com uma prioridade fora da lista ou um identificador de categoria que não é UUID
- **THEN** o campo correspondente mostra a mensagem de seleção obrigatória e a API não é chamada

### Requirement: Valores preservados após erro
Depois de qualquer erro de validação ou da API, o sistema SHALL manter preenchidos título, descrição, prioridade e categoria, para o cliente não perder o que escreveu.

#### Scenario: Erro com descrição longa
- **WHEN** o cliente escreve uma descrição longa e o envio falha por título curto
- **THEN** o formulário volta com a mesma descrição, prioridade e categoria e só o título marcado com erro

### Requirement: Envio único da abertura
Enquanto o envio estiver em andamento, o botão SHALL ficar desabilitado com o texto "Abrindo...", impedindo um segundo envio, e o estado de envio MUST ser anunciado a leitores de tela.

#### Scenario: Duplo clique
- **WHEN** o cliente clica duas vezes seguidas em "Abrir chamado"
- **THEN** apenas um chamado é criado

### Requirement: Confirmação após abrir
Quando a API criar o chamado, o sistema SHALL levar o cliente para `/chamados` com o aviso "Chamado aberto.", anunciado a leitores de tela. O chamado novo SHALL aparecer no topo da lista, com status "Aberto".

#### Scenario: Chamado criado
- **WHEN** o cliente envia título, descrição, prioridade e categoria válidos e a API responde 201
- **THEN** o sistema exibe `/chamados` com o aviso "Chamado aberto." e o chamado novo é o primeiro da lista, com status "Aberto"

#### Scenario: Aviso não é injetável
- **WHEN** alguém acessa `/chamados` com um código de aviso desconhecido na URL
- **THEN** nenhum aviso é exibido e nenhum texto da URL é renderizado

### Requirement: Categoria indisponível no envio
Se a API recusar a categoria com 422 (desativada entre abrir o formulário e enviar), o sistema SHALL exibir no campo "Categoria" a mensagem "Esta categoria não está mais disponível. Escolha outra." e recarregar a lista de categorias, preservando os demais campos.

#### Scenario: Categoria desativada durante o preenchimento
- **WHEN** o cliente escolhe "Hardware", um administrador desativa "Hardware" e o cliente envia o formulário
- **THEN** o campo "Categoria" mostra "Esta categoria não está mais disponível. Escolha outra.", "Hardware" não aparece mais entre as opções e título, descrição e prioridade continuam preenchidos

### Requirement: Erros da API na abertura
O sistema SHALL tratar as demais respostas de `POST /tickets` sem exibir texto técnico ou mensagens da API: 400 mostra as mensagens pt-BR nos campos correspondentes, ou "Verifique os dados informados." se não for possível associá-las; 403 mostra "Você não tem permissão para esta ação."; falha de rede ou 5xx mostra "Não foi possível conectar ao servidor. Tente novamente em instantes.".

#### Scenario: Validação recusada pela API
- **WHEN** a API responde 400 com `title must be longer than or equal to 5 characters`
- **THEN** o campo "Título" mostra "O título deve ter entre 5 e 120 caracteres."

#### Scenario: Papel alterado durante a sessão
- **WHEN** a API responde 403 ao envio
- **THEN** o formulário mostra "Você não tem permissão para esta ação." e mantém os valores

#### Scenario: API indisponível no envio
- **WHEN** a API não responde ao envio
- **THEN** o formulário mostra "Não foi possível conectar ao servidor. Tente novamente em instantes." e mantém os valores

### Requirement: Sessão expirada na abertura
Se `POST /tickets` responder 401, o sistema MUST renovar a sessão uma vez e repetir o envio. Se a renovação falhar, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: Refresh token inválido no envio
- **WHEN** o envio recebe 401 e a renovação da sessão também falha
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente." e nenhum chamado é criado

#### Scenario: Access token expirado no envio
- **WHEN** o envio recebe 401 e o refresh token ainda é válido
- **THEN** o sistema renova a sessão, repete o envio uma única vez e o chamado é criado

### Requirement: Formulário de abertura responsivo
O formulário MUST ser responsivo (mobile-first), em uma coluna no mobile, sem scroll horizontal em 360px, com campos e botões de pelo menos 44px de altura, e seguir os temas claro e escuro. A partir de `md`, prioridade e categoria MAY ficar lado a lado.

#### Scenario: Formulário no mobile
- **WHEN** `/chamados/novo` é aberto em 360px de largura
- **THEN** os campos ficam em uma coluna, os botões têm pelo menos 44px de altura e não há scroll horizontal

#### Scenario: Formulário no desktop
- **WHEN** `/chamados/novo` é aberto em 1280px de largura
- **THEN** o formulário ocupa um painel de largura limitada dentro da área de trabalho, seguindo os tokens do design system
