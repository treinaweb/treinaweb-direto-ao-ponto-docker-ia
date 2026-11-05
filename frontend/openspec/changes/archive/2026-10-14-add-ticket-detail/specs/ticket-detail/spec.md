# Spec Delta

## Purpose

Visualização completa de um chamado do TreinaDesk e execução das ações de atribuição e mudança de status que o papel e o status atual permitem, sem oferecer ações que a API recusaria, com confirmações, mensagens e tratamento de erros.

## ADDED Requirements

### Requirement: Informações do chamado
O sistema SHALL exibir em `/chamados/{id}` o título do chamado, o status e a prioridade (texto e cor), a categoria, o nome do cliente, o nome do atendente (ou "Na fila" quando não houver), a descrição completa e as datas de abertura e de última atualização. Quando o chamado estiver fechado, MUST exibir também a data de fechamento.

#### Scenario: Chamado em andamento
- **WHEN** o usuário abre um chamado "Em andamento" atribuído a Bruno
- **THEN** a página mostra o título, os chips "Em andamento" e da prioridade, a categoria, o cliente, "Bruno" como atendente, a descrição e as datas de abertura e atualização

#### Scenario: Chamado na fila
- **WHEN** o usuário abre um chamado sem atendente
- **THEN** o campo do atendente mostra "Na fila"

#### Scenario: Chamado fechado
- **WHEN** o usuário abre um chamado com status "Fechado"
- **THEN** a página mostra também "Fechado em" com a data de fechamento

### Requirement: Descrição exibida como texto
A descrição MUST ser exibida como texto simples, preservando as quebras de linha, sem interpretar HTML ou marcação.

#### Scenario: Descrição com marcação
- **WHEN** a descrição contém `<b>urgente</b>` e duas quebras de linha
- **THEN** a página mostra o texto `<b>urgente</b>` literalmente e mantém as quebras de linha

### Requirement: Chamado não encontrado
O sistema SHALL exibir a página "Chamado não encontrado." com o link "Voltar aos chamados" quando o identificador não for UUID, quando o chamado não existir e quando estiver fora da visibilidade do usuário, sem diferenciar esses casos. Com identificador inválido, a API MUST NOT ser chamada.

#### Scenario: Identificador inválido
- **WHEN** o usuário acessa `/chamados/abc`
- **THEN** o sistema exibe "Chamado não encontrado." sem chamar a API

#### Scenario: Chamado de outro cliente
- **WHEN** um `CUSTOMER` acessa o endereço de um chamado aberto por outro cliente
- **THEN** o sistema exibe "Chamado não encontrado.", igual a um chamado inexistente

### Requirement: Falha ao carregar o chamado
Se a API falhar ao devolver o chamado (rede ou 5xx), o sistema SHALL exibir "Não foi possível carregar o chamado." e a opção "Tentar novamente", sem detalhes técnicos. Em 401, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: API fora do ar
- **WHEN** o usuário abre um chamado e a API não responde
- **THEN** a página mostra "Não foi possível carregar o chamado." e "Tentar novamente"

#### Scenario: Sessão expirada ao abrir
- **WHEN** `GET /tickets/{id}` responde 401
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente."

### Requirement: Somente ações permitidas
O sistema MUST exibir apenas as ações que a API aceita para o papel do usuário, sua relação com o chamado (cliente dono, atendente atribuído ou não) e o status atual, conforme os requisitos de ações de cada papel. Uma ação que a API recusaria MUST NOT aparecer, nem desabilitada. Quando não houver ação disponível, a área de ações MUST NOT ser exibida.

#### Scenario: Chamado fechado não tem ações
- **WHEN** qualquer usuário abre um chamado "Fechado"
- **THEN** a página não exibe nenhuma ação

#### Scenario: Nenhuma transição manual de Aberto para Em andamento
- **WHEN** qualquer usuário abre um chamado "Aberto"
- **THEN** nenhuma ação de mudar o status para "Em andamento" é exibida

### Requirement: Ações do cliente
O `CUSTOMER` dono do chamado SHALL ver "Fechar chamado" quando o status for "Aberto" ou "Resolvido" e "Reabrir" quando o status for "Resolvido". Nos demais status, o cliente MUST NOT ver ações.

#### Scenario: Cliente com chamado resolvido
- **WHEN** o cliente abre o próprio chamado "Resolvido"
- **THEN** a página exibe "Reabrir" e "Fechar chamado"

#### Scenario: Cliente reabre
- **WHEN** o cliente aciona "Reabrir" num chamado "Resolvido"
- **THEN** o chamado passa a "Em andamento" e a página mostra "Chamado reaberto."

#### Scenario: Cliente com chamado em andamento
- **WHEN** o cliente abre o próprio chamado "Em andamento"
- **THEN** a página não exibe ações

### Requirement: Aviso ao cliente aguardando resposta
Quando o chamado do cliente estiver "Aguardando cliente", o sistema SHALL exibir ao `CUSTOMER` o aviso "O atendimento aguarda sua resposta. Em breve você poderá responder por aqui.".

#### Scenario: Chamado aguardando o cliente
- **WHEN** o cliente abre o próprio chamado "Aguardando cliente"
- **THEN** a página mostra o aviso de resposta aguardada e nenhuma ação

### Requirement: Ações do atendente
O `SUPPORT` SHALL ver "Assumir" num chamado "Aberto" sem atendente. Quando for o atendente atribuído, SHALL ver "Aguardar cliente" e "Resolver" com o status "Em andamento", e "Resolver" com o status "Aguardando cliente". Em chamados "Resolvido" ou "Fechado", o atendente MUST NOT ver ações.

#### Scenario: Atendente assume da fila
- **WHEN** um `SUPPORT` aciona "Assumir" num chamado da fila
- **THEN** o chamado passa a "Em andamento" com ele como atendente e a página mostra "Chamado assumido."

#### Scenario: Atendente aguarda o cliente
- **WHEN** o atendente atribuído aciona "Aguardar cliente" num chamado "Em andamento"
- **THEN** o chamado passa a "Aguardando cliente" e a página mostra "Chamado aguardando o cliente."

#### Scenario: Atendente resolve
- **WHEN** o atendente atribuído aciona "Resolver" num chamado "Aguardando cliente"
- **THEN** o chamado passa a "Resolvido" e a página mostra "Chamado resolvido."

### Requirement: Ações do administrador
O `ADMIN` SHALL ver "Atribuir" num chamado "Aberto" sem atendente e "Reatribuir" nos chamados "Aberto", "Em andamento" ou "Aguardando cliente" com atendente. Além disso, SHALL ver "Aguardar cliente" e "Resolver" com o status "Em andamento", "Resolver" com "Aguardando cliente" e "Fechar chamado" com "Aberto" ou "Resolvido". O `ADMIN` MUST NOT ver "Reabrir" nem "Assumir".

#### Scenario: Administrador num chamado da fila
- **WHEN** um `ADMIN` abre um chamado "Aberto" sem atendente
- **THEN** a página exibe "Atribuir" e "Fechar chamado"

#### Scenario: Administrador num chamado resolvido
- **WHEN** um `ADMIN` abre um chamado "Resolvido"
- **THEN** a página exibe apenas "Fechar chamado"

### Requirement: Escolha do atendente na atribuição
Ao atribuir ou reatribuir, o `ADMIN` SHALL escolher entre todos os usuários `SUPPORT`, em ordem alfabética, sem o atendente atual. Atribuir um chamado "Aberto" MUST levá-lo a "Em andamento" e a página MUST mostrar "Chamado atribuído a {nome}.". Sem atendentes, SHALL exibir "Nenhum atendente disponível para atribuição.". Se a lista falhar, SHALL exibir "Não foi possível carregar os atendentes.", mantendo as outras ações.

#### Scenario: Atribuir a um atendente
- **WHEN** o `ADMIN` escolhe "Bruno" e confirma a atribuição de um chamado "Aberto"
- **THEN** o chamado passa a "Em andamento" com "Bruno" como atendente e a página mostra "Chamado atribuído a Bruno."

#### Scenario: Reatribuir sem o atendente atual
- **WHEN** o `ADMIN` abre "Reatribuir" num chamado atribuído a Bruno
- **THEN** "Bruno" não aparece entre as opções

#### Scenario: Falha ao listar atendentes
- **WHEN** a API falha ao listar os usuários
- **THEN** o lugar da atribuição mostra "Não foi possível carregar os atendentes." e "Fechar chamado" ou "Resolver" continuam disponíveis quando permitidos

### Requirement: Confirmação para fechar
Antes de fechar um chamado, o sistema SHALL pedir confirmação com o texto "Fechar este chamado? Depois de fechado, ele não pode ser reaberto." e as opções "Fechar chamado" e "Cancelar". Só a confirmação MUST enviar a ação.

#### Scenario: Fechar confirmado
- **WHEN** o usuário aciona "Fechar chamado" e confirma
- **THEN** o chamado passa a "Fechado", a data de fechamento aparece, as ações somem e a página mostra "Chamado fechado."

#### Scenario: Fechar cancelado
- **WHEN** o usuário aciona "Fechar chamado" e escolhe "Cancelar"
- **THEN** nada é enviado à API e o chamado continua como estava

### Requirement: Resultado de uma ação
Depois de uma ação aceita, o sistema SHALL exibir o chamado atualizado (status, atendente, datas e ações disponíveis) e uma mensagem de confirmação anunciada a leitores de tela.

#### Scenario: Ações mudam com o status
- **WHEN** o atendente resolve um chamado
- **THEN** o chip passa a "Resolvido", a data de atualização muda e "Aguardar cliente" e "Resolver" deixam de ser exibidos

### Requirement: Envio único das ações
Enquanto uma ação estiver em andamento, o sistema SHALL desabilitar todas as ações do chamado e indicar o envio no botão acionado, impedindo um segundo envio.

#### Scenario: Duplo clique em Resolver
- **WHEN** o atendente clica duas vezes seguidas em "Resolver"
- **THEN** apenas uma requisição de mudança de status é enviada

### Requirement: Chamado alterado por outra pessoa
Se a API responder 409 ou 422 a uma ação, o sistema SHALL recarregar o chamado, exibir as ações válidas para o novo estado e mostrar, no 409, "Este chamado foi alterado por outra pessoa. Confira a situação atual e tente novamente." e, no 422, "Esta ação não está mais disponível para a situação atual do chamado.".

#### Scenario: Conflito de concorrência
- **WHEN** o atendente aciona "Resolver" e a API responde 409
- **THEN** a página mostra o chamado recarregado e a mensagem de alteração por outra pessoa

#### Scenario: Transição não mais permitida
- **WHEN** o cliente aciona "Fechar chamado" num chamado que outra pessoa acabou de reabrir e a API responde 422
- **THEN** a página mostra o chamado recarregado, só as ações válidas agora e "Esta ação não está mais disponível para a situação atual do chamado."

#### Scenario: Outro atendente assumiu antes
- **WHEN** dois atendentes acionam "Assumir" no mesmo chamado e a API responde 409 ou 422 ao segundo
- **THEN** o segundo atendente vê o chamado recarregado ou "Chamado não encontrado." se ele não estiver mais visível, sem mensagem técnica

### Requirement: Chamado indisponível durante a ação
Se a API responder 404 a uma ação, o sistema SHALL exibir "Este chamado não está mais disponível para você." e o link "Voltar aos chamados".

#### Scenario: Chamado reatribuído enquanto aberto
- **WHEN** um administrador reatribui o chamado e o atendente anterior, com a página ainda aberta, aciona "Resolver"
- **THEN** a página mostra "Este chamado não está mais disponível para você." e o link "Voltar aos chamados"

### Requirement: Demais erros das ações
O sistema SHALL tratar os demais erros das ações sem exibir texto técnico ou mensagens da API: 403 mostra "Você não tem permissão para esta ação.", 400 mostra "Verifique os dados informados." e falha de rede ou 5xx mostra "Não foi possível conectar ao servidor. Tente novamente em instantes.". Em 401, MUST renovar a sessão uma vez e repetir a ação; se a renovação falhar, MUST levar ao login.

#### Scenario: Papel sem permissão
- **WHEN** uma ação recebe 403
- **THEN** a página mostra "Você não tem permissão para esta ação." e o chamado continua como estava

#### Scenario: API indisponível na ação
- **WHEN** o usuário aciona uma ação e a API não responde
- **THEN** a página mostra "Não foi possível conectar ao servidor. Tente novamente em instantes." e as ações voltam a ficar disponíveis

#### Scenario: Access token expirado na ação
- **WHEN** a ação recebe 401 e o refresh token ainda é válido
- **THEN** o sistema renova a sessão, repete a ação uma única vez e mostra o resultado

### Requirement: Detalhe responsivo
A página MUST ser responsiva (mobile-first), sem scroll horizontal em 360px, com ações de pelo menos 44px de altura e suporte aos temas claro e escuro. Abaixo de `lg`, SHALL ter uma coluna: cabeçalho com título e chips, ações, informações e descrição. A partir de `lg`, SHALL ter a descrição à esquerda e um painel lateral com informações e ações.

#### Scenario: Detalhe no mobile
- **WHEN** um chamado é aberto em 360px de largura
- **THEN** o conteúdo fica em uma coluna, as ações ocupam a largura disponível logo abaixo do cabeçalho e não há scroll horizontal

#### Scenario: Detalhe no desktop
- **WHEN** um chamado é aberto em 1280px de largura
- **THEN** a descrição fica à esquerda e as informações e ações num painel à direita
