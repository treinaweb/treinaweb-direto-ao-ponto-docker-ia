# ticket-list Specification

## Purpose

Lista dos chamados que o usuário logado pode ver no TreinaDesk, com filtros por status e prioridade guardados na URL, paginação, estados vazios e de falha, e layout responsivo.

## Requirements

### Requirement: Chamados visíveis ao papel
O sistema SHALL exibir em `/chamados` os chamados que a API devolve para o usuário logado, na ordem da API (mais recentes primeiro): o `CUSTOMER` vê só os próprios, o `SUPPORT` vê a fila e os atribuídos a ele, o `ADMIN` vê todos. O título da página MUST ser "Meus chamados" para o cliente e "Chamados" para a equipe.

#### Scenario: Cliente vê só os próprios chamados
- **WHEN** um `CUSTOMER` com chamados abre `/chamados`
- **THEN** a página tem o título "Meus chamados" e lista apenas chamados abertos por ele, do mais recente para o mais antigo

#### Scenario: Equipe vê o título genérico
- **WHEN** um `SUPPORT` ou `ADMIN` abre `/chamados`
- **THEN** a página tem o título "Chamados"

### Requirement: Informações de cada chamado na lista
Cada chamado da lista SHALL mostrar título, status, prioridade, categoria e data de abertura. Para `SUPPORT` e `ADMIN`, MUST mostrar também o nome do cliente e o nome do atendente, ou "Na fila" quando não houver atendente. O cliente MUST NOT ver as informações de cliente e atendente na lista. Status e prioridade MUST aparecer com texto e cor, nunca só com cor.

#### Scenario: Linha vista pelo cliente
- **WHEN** um `CUSTOMER` vê a lista
- **THEN** cada chamado mostra título, status (por exemplo "Aberto"), prioridade (por exemplo "Alta"), categoria e data de abertura, sem nome de cliente nem de atendente

#### Scenario: Chamado sem atendente visto pela equipe
- **WHEN** um `ADMIN` vê na lista um chamado sem atendente
- **THEN** a linha mostra o nome do cliente e "Na fila" no lugar do atendente

### Requirement: Acesso ao chamado pela lista
Cada chamado da lista SHALL ser um link para `/chamados/{id}`, acionável pelo teclado e com área de toque de pelo menos 44px de altura.

#### Scenario: Abrir um chamado da lista
- **WHEN** o usuário clica em qualquer ponto da linha de um chamado
- **THEN** o sistema navega para `/chamados/{id}` desse chamado

### Requirement: Filtros por status e prioridade
O sistema SHALL permitir filtrar a lista por status (Aberto, Em andamento, Aguardando cliente, Resolvido, Fechado) e por prioridade (Urgente, Alta, Média, Baixa), isolados ou combinados. Os filtros MUST ficar na URL (`status`, `priority`), MUST voltar para a página 1 quando mudarem e SHALL ter a opção "Limpar filtros" quando houver filtro ativo.

#### Scenario: Filtrar por prioridade
- **WHEN** o usuário escolhe a prioridade "Urgente"
- **THEN** a URL passa a ter `priority=URGENT` e a lista mostra só chamados com prioridade "Urgente"

#### Scenario: Filtros combinados
- **WHEN** o usuário está em `/chamados?status=OPEN&page=3` e escolhe a prioridade "Alta"
- **THEN** a URL passa a ser `/chamados?status=OPEN&priority=HIGH`, na página 1, e a lista mostra só chamados abertos com prioridade "Alta"

#### Scenario: Link do painel já filtrado
- **WHEN** o usuário clica no cartão "Em andamento" do painel
- **THEN** a lista abre com o filtro de status "Em andamento" já selecionado

#### Scenario: Limpar filtros
- **WHEN** há filtro ativo e o usuário aciona "Limpar filtros"
- **THEN** o sistema abre `/chamados` sem filtros

#### Scenario: Voltar no navegador
- **WHEN** o usuário aplica um filtro e depois usa o botão voltar do navegador
- **THEN** a lista volta ao estado anterior ao filtro

### Requirement: Parâmetros inválidos na URL
O sistema MUST validar os parâmetros `status`, `priority` e `page` da URL no servidor e SHALL descartar cada valor inválido, exibindo a lista como se ele não tivesse sido informado, sem mensagem de erro e sem enviar o valor inválido à API.

#### Scenario: Status desconhecido
- **WHEN** o usuário acessa `/chamados?status=xyz&priority=LOW`
- **THEN** a lista é exibida só com o filtro de prioridade "Baixa" e o filtro de status aparece sem seleção

#### Scenario: Página inválida
- **WHEN** o usuário acessa `/chamados?page=-1` ou `/chamados?page=abc`
- **THEN** a lista é exibida na página 1

### Requirement: Atalho da fila para o atendente
O sistema SHALL exibir ao `SUPPORT` um atalho "Fila" que aplica o filtro de status "Aberto", que para esse papel corresponde aos chamados sem atendente. O atalho MUST aparecer como ativo quando esse filtro estiver aplicado e MUST NOT aparecer para `CUSTOMER` e `ADMIN`.

#### Scenario: Atendente abre a fila
- **WHEN** um `SUPPORT` aciona "Fila"
- **THEN** o sistema abre `/chamados?status=OPEN` e lista só chamados com status "Aberto" e "Na fila"

#### Scenario: Atalho ausente para o cliente
- **WHEN** um `CUSTOMER` abre `/chamados`
- **THEN** a página não mostra o atalho "Fila"

### Requirement: Paginação da lista
O sistema SHALL exibir 20 chamados por página, o total de chamados encontrados com os filtros atuais (por exemplo "42 chamados") e, quando houver mais de uma página, os controles "Anterior" e "Próxima" e o texto "Página X de Y". A página MUST ficar na URL (`page`) e a troca de página MUST manter os filtros.

#### Scenario: Ir para a próxima página
- **WHEN** há 42 chamados com o filtro `status=OPEN` e o usuário aciona "Próxima" na página 1
- **THEN** o sistema abre `/chamados?status=OPEN&page=2` e mostra "Página 2 de 3"

#### Scenario: Limites da paginação
- **WHEN** o usuário está na primeira página
- **THEN** o controle "Anterior" fica indisponível; na última página, "Próxima" fica indisponível

#### Scenario: Uma única página
- **WHEN** o total de chamados cabe em uma página
- **THEN** os controles de paginação não são exibidos

### Requirement: Página além do total
Quando a página pedida for maior que o número de páginas existentes, o sistema SHALL exibir a mensagem "Esta página não tem chamados." e um link "Ir para a primeira página" que mantém os filtros.

#### Scenario: Página inexistente
- **WHEN** há 5 chamados e o usuário acessa `/chamados?page=9`
- **THEN** a página mostra "Esta página não tem chamados." e o link "Ir para a primeira página", que leva a `/chamados`

### Requirement: Lista vazia
O sistema SHALL distinguir a lista vazia sem filtros da lista vazia por causa dos filtros. Sem filtros, o `CUSTOMER` MUST ver "Você ainda não abriu chamados." e o botão "Abrir chamado", e a equipe MUST ver "Nenhum chamado por aqui.". Com filtros, todos MUST ver "Nenhum chamado com esses filtros." e a opção "Limpar filtros".

#### Scenario: Cliente sem chamados
- **WHEN** um `CUSTOMER` que nunca abriu chamados acessa `/chamados`
- **THEN** a página mostra "Você ainda não abriu chamados." e o botão "Abrir chamado", que leva a `/chamados/novo`

#### Scenario: Filtro sem resultado
- **WHEN** nenhum chamado visível tem o status e a prioridade escolhidos
- **THEN** a página mostra "Nenhum chamado com esses filtros." e a opção "Limpar filtros"

### Requirement: Carregamento da lista
Enquanto a lista carrega, o sistema SHALL manter visíveis o título e os filtros e exibir um esqueleto no lugar dos chamados.

#### Scenario: Troca de filtro em andamento
- **WHEN** o usuário troca um filtro e a API ainda não respondeu
- **THEN** o título e os filtros continuam na tela e a área da lista mostra o esqueleto de carregamento

### Requirement: Falha ao carregar a lista
Se a API responder com falha de rede, 5xx ou qualquer erro diferente de 401, o sistema SHALL exibir no lugar da lista "Não foi possível carregar os chamados." e a opção "Tentar novamente", mantendo título e filtros. Em 401, o sistema MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.". Nenhum detalhe técnico ou texto da API MUST ser exibido.

#### Scenario: API fora do ar
- **WHEN** o usuário abre `/chamados` e a API não responde
- **THEN** a página mostra "Não foi possível carregar os chamados." e "Tentar novamente", e o título e os filtros continuam visíveis

#### Scenario: Erro inesperado da API
- **WHEN** `GET /tickets` responde 400 ou 500
- **THEN** a página mostra "Não foi possível carregar os chamados." sem exibir a mensagem da API

#### Scenario: Sessão expirada
- **WHEN** `GET /tickets` responde 401
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente."

### Requirement: Lista responsiva
A lista MUST ser responsiva (mobile-first) e não ter scroll horizontal da página em 360px. Abaixo de `md`, cada chamado SHALL ser um card com título, chips de status e prioridade e os metadados abaixo. A partir de `md`, os chamados SHALL ser linhas alinhadas em colunas com cabeçalho. Filtros e controles de paginação MUST ter alvos de toque de pelo menos 44px e seguir os temas claro e escuro.

#### Scenario: Lista no mobile
- **WHEN** a lista é aberta em 360px de largura
- **THEN** cada chamado aparece como card, os filtros ficam empilhados em uma coluna e não há scroll horizontal

#### Scenario: Lista no desktop
- **WHEN** a lista é aberta em 1280px de largura
- **THEN** os chamados aparecem em linhas com colunas alinhadas sob um cabeçalho (Título, Status, Prioridade, Categoria, Aberto em e, para a equipe, Cliente e Atendente)
