# role-dashboard Specification

## Purpose

Painel inicial (`/dashboard`) de cada papel do TreinaDesk: indicadores e listas resumidas, obtidos da API, que respondem à pergunta principal de cada usuário. O cliente vê o que precisa fazer, o atendente vê o que pegar a seguir e o administrador vê como está a operação.

## Requirements

### Requirement: Painel conforme o papel
O sistema SHALL exibir em `/dashboard`, abaixo da saudação "Olá, {nome}", o conteúdo do painel correspondente ao papel do usuário logado (`CUSTOMER`, `SUPPORT` ou `ADMIN`), e nunca o painel de outro papel.

#### Scenario: Cada papel vê o seu painel
- **WHEN** um usuário `SUPPORT` abre `/dashboard`
- **THEN** o sistema exibe os indicadores e listas do atendente, sem os resumos de categorias e usuários do administrador

### Requirement: Somente dados reais
Os indicadores MUST mostrar apenas valores obtidos da API. O painel MUST NOT exibir tendências percentuais, séries temporais ou qualquer número estimado.

#### Scenario: Indicador sem tendência
- **WHEN** qualquer usuário vê os cartões de indicadores
- **THEN** cada cartão mostra um rótulo e um número, sem percentual de variação

### Requirement: Indicadores do cliente
O sistema SHALL exibir ao `CUSTOMER` quatro cartões com a quantidade dos seus chamados por status: "Abertos" (`OPEN`), "Em andamento" (`IN_PROGRESS`), "Aguardando sua resposta" (`WAITING_CUSTOMER`) e "Resolvidos" (`RESOLVED`).

#### Scenario: Cliente com chamados em vários status
- **WHEN** o cliente tem 2 chamados `OPEN`, 1 `IN_PROGRESS`, 1 `WAITING_CUSTOMER` e 3 `RESOLVED`
- **THEN** os cartões mostram 2, 1, 1 e 3, respectivamente

### Requirement: Chamados que precisam da atenção do cliente
O sistema SHALL exibir ao `CUSTOMER` o painel "Precisam da sua atenção", com até 5 chamados em `WAITING_CUSTOMER` (indicados como "Responder") e, depois, em `RESOLVED` (indicados como "Confirmar solução"), cada um com título, chip de status e link para `/chamados/{id}`. Sem chamados nesses status, o painel MUST exibir "Nada pendente com você.".

#### Scenario: Chamado aguardando resposta
- **WHEN** o cliente tem um chamado em `WAITING_CUSTOMER`
- **THEN** o painel lista o chamado com o título, o chip "Aguardando cliente" e a indicação "Responder"

#### Scenario: Nada pendente
- **WHEN** o cliente não tem chamados em `WAITING_CUSTOMER` nem em `RESOLVED`
- **THEN** o painel exibe "Nada pendente com você."

### Requirement: Chamados recentes do cliente
O sistema SHALL exibir ao `CUSTOMER` o painel "Chamados recentes" com os 5 chamados mais recentes, cada um com título, chip de status, categoria e data de abertura, e um link "Ver todos" para `/chamados`.

#### Scenario: Lista de recentes
- **WHEN** o cliente tem 8 chamados
- **THEN** o painel lista os 5 mais recentes, do mais novo para o mais antigo

### Requirement: Cliente sem chamados
O sistema SHALL exibir ao `CUSTOMER` sem nenhum chamado, no lugar dos painéis de listas, o estado vazio "Você ainda não abriu chamados." com um botão "Abrir chamado" para `/chamados/novo`.

#### Scenario: Primeiro acesso do cliente
- **WHEN** um cliente recém-cadastrado abre `/dashboard`
- **THEN** os cartões mostram 0 e o painel exibe "Você ainda não abriu chamados." com o botão "Abrir chamado"

### Requirement: Indicadores do atendente
O sistema SHALL exibir ao `SUPPORT` quatro cartões: "Na fila" (chamados `OPEN`, que para o atendente são os da fila sem atendente), "Em atendimento" (`IN_PROGRESS`), "Aguardando cliente" (`WAITING_CUSTOMER`) e "Resolvidos" (`RESOLVED`), os três últimos contando apenas os chamados atribuídos a ele, conforme a visibilidade da API.

#### Scenario: Atendente com fila e chamados próprios
- **WHEN** há 4 chamados na fila e o atendente tem 2 chamados `IN_PROGRESS` atribuídos a ele
- **THEN** o cartão "Na fila" mostra 4 e o cartão "Em atendimento" mostra 2

### Requirement: Próximos chamados da fila
O sistema SHALL exibir ao `SUPPORT` o painel "Próximos da fila" com até 5 chamados `OPEN` mais recentes, cada um com título, chip de prioridade, categoria, cliente e data de abertura, com link para `/chamados/{id}` e um link "Ver fila" para `/chamados?status=OPEN`. Com a fila vazia, o painel MUST exibir "A fila está vazia.".

#### Scenario: Fila com chamados
- **WHEN** há chamados na fila
- **THEN** o painel lista até 5 deles, cada um com o chip de prioridade com texto (por exemplo, "Urgente")

#### Scenario: Fila vazia
- **WHEN** não há chamados `OPEN` visíveis para o atendente
- **THEN** o painel exibe "A fila está vazia."

### Requirement: Fila por prioridade
O sistema SHALL exibir ao `SUPPORT` o painel "Fila por prioridade" com a quantidade de chamados `OPEN` em cada prioridade ("Urgente", "Alta", "Média", "Baixa"), cada linha com rótulo, número e uma barra proporcional.

#### Scenario: Distribuição da fila
- **WHEN** a fila tem 1 chamado `URGENT`, 2 `HIGH`, 0 `MEDIUM` e 3 `LOW`
- **THEN** o painel mostra "Urgente 1", "Alta 2", "Média 0" e "Baixa 3", com barras proporcionais

### Requirement: Indicadores do administrador
O sistema SHALL exibir ao `ADMIN` quatro cartões com a quantidade de todos os chamados: "Sem atendente" (`OPEN`), "Em andamento" (`IN_PROGRESS`), "Aguardando cliente" (`WAITING_CUSTOMER`) e "Resolvidos" (`RESOLVED`).

#### Scenario: Visão geral do administrador
- **WHEN** o administrador abre `/dashboard`
- **THEN** os quatro cartões mostram os totais de todos os chamados do sistema em cada status

### Requirement: Distribuição por status
O sistema SHALL exibir ao `ADMIN` o painel "Chamados por status", um gráfico de rosca com os cinco status (incluindo "Fechados", `CLOSED`) e uma legenda com rótulo, quantidade e percentual de cada status. Sem nenhum chamado, o painel MUST exibir "Nenhum chamado registrado." no lugar do gráfico.

#### Scenario: Percentuais do gráfico
- **WHEN** existem 10 chamados, 5 deles `CLOSED`
- **THEN** a legenda mostra "Fechados 5 (50%)"

#### Scenario: Sistema sem chamados
- **WHEN** não existe nenhum chamado
- **THEN** o painel exibe "Nenhum chamado registrado."

### Requirement: Distribuição por prioridade
O sistema SHALL exibir ao `ADMIN` o painel "Chamados por prioridade", um gráfico de barras com a quantidade de chamados em cada prioridade ("Urgente", "Alta", "Média", "Baixa"), com cada barra rotulada pelo nome e pelo número.

#### Scenario: Barras por prioridade
- **WHEN** o administrador abre o painel
- **THEN** o gráfico mostra quatro barras, cada uma com o nome da prioridade e a quantidade

### Requirement: Resumo de categorias e usuários
O sistema SHALL exibir ao `ADMIN` o painel "Categorias", com a quantidade de categorias ativas e inativas e o link "Gerenciar categorias" (`/categorias`), e o painel "Usuários", com o total de usuários cadastrados e o link "Gerenciar usuários" (`/usuarios`).

#### Scenario: Resumo de categorias
- **WHEN** existem 5 categorias ativas e 2 inativas
- **THEN** o painel mostra "5 ativas" e "2 inativas" e o link "Gerenciar categorias"

### Requirement: Cartões levam à lista filtrada
Cada cartão de indicador de status SHALL ser um link para `/chamados?status={STATUS}` com o status correspondente.

#### Scenario: Clique em um cartão
- **WHEN** o atendente clica no cartão "Na fila"
- **THEN** o sistema navega para `/chamados?status=OPEN`

### Requirement: Status e prioridade com texto
Status e prioridade MUST ser exibidos sempre com texto e cor, nos rótulos em pt-BR: "Aberto", "Em andamento", "Aguardando cliente", "Resolvido", "Fechado"; "Urgente", "Alta", "Média", "Baixa". Os gráficos MUST ter uma alternativa textual com os mesmos números.

#### Scenario: Leitor de tela no gráfico
- **WHEN** um leitor de tela chega ao gráfico de rosca
- **THEN** ele anuncia um resumo com cada status e sua quantidade

### Requirement: Números formatados
Os números do painel MUST usar formatação pt-BR (separador de milhar ".") e algarismos tabulares.

#### Scenario: Milhar
- **WHEN** um indicador vale 1234
- **THEN** o cartão mostra "1.234"

### Requirement: Carregamento independente dos painéis
Cada painel e o grupo de cartões SHALL carregar de forma independente, exibindo um esqueleto com `aria-busy="true"` enquanto aguarda a API, sem bloquear a saudação nem os demais painéis.

#### Scenario: Painel lento
- **WHEN** a contagem por prioridade demora a responder
- **THEN** a saudação e os cartões aparecem e o painel "Fila por prioridade" mostra o esqueleto até receber os dados

### Requirement: Falha isolada por painel
Quando a API falhar ao carregar os dados de um painel (rede, 5xx ou 403), o sistema SHALL exibir nesse painel "Não foi possível carregar estes dados." com a opção "Tentar novamente", mantendo os demais painéis. Uma resposta 401 MUST levar ao login conforme a capability `auth-session`, sem tentar renovar a sessão durante a renderização.

#### Scenario: Um painel falha
- **WHEN** `GET /categories` responde 5xx no painel do administrador
- **THEN** o painel "Categorias" exibe "Não foi possível carregar estes dados." e os gráficos e cartões continuam visíveis

#### Scenario: Sessão recusada durante o carregamento
- **WHEN** a API responde 401 ao carregar um painel
- **THEN** o sistema redireciona para `/login` com o aviso de sessão expirada

### Requirement: Painel responsivo
O painel MUST ser mobile-first, sem scroll horizontal em 360px: cartões em 1 coluna abaixo de 640px, 2 colunas a partir de 640px e 4 a partir de 1024px; painéis de listas e gráficos empilhados abaixo de 1024px e lado a lado a partir daí; legendas dos gráficos abaixo do gráfico no mobile. Os cartões mantêm o fundo `primary-soft` nos temas claro e escuro.

#### Scenario: Painel no mobile
- **WHEN** o painel é aberto em 360px
- **THEN** os cartões ficam em uma coluna, os painéis empilhados e não há scroll horizontal

#### Scenario: Painel no desktop
- **WHEN** o painel é aberto em 1280px
- **THEN** os quatro cartões ficam em uma linha e os painéis aparecem lado a lado

#### Scenario: Painel no tema escuro
- **WHEN** o sistema operacional está em modo escuro
- **THEN** os painéis usam o fundo `charcoal` e os cartões continuam com fundo `primary-soft` e texto escuro
