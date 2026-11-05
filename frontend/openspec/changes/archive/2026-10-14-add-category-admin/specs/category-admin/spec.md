# Spec Delta

## Purpose

Administração das categorias de chamado pelo administrador do TreinaDesk: lista completa com o estado de cada categoria, criação, renomeação, ativação e desativação (que substitui a exclusão), com validações em pt-BR, retorno anunciado e tratamento dos erros da API.

## ADDED Requirements

### Requirement: Página de categorias do administrador
O sistema SHALL exibir ao `ADMIN` em `/categorias` a página "Categorias", com o botão "Nova categoria" e a lista de categorias. Os demais papéis MUST continuar recebendo a página "não encontrado", sem chamada à API de categorias.

#### Scenario: Administrador abre a página
- **WHEN** um `ADMIN` clica em "Categorias" no grupo "Administração"
- **THEN** o sistema exibe o título "Categorias", o botão "Nova categoria" e a lista de categorias, e não exibe "Esta página estará disponível em breve."

#### Scenario: Outro papel tenta abrir a página
- **WHEN** um `CUSTOMER` ou `SUPPORT` acessa `/categorias`
- **THEN** o sistema exibe a página "não encontrado" e não chama a API de categorias

### Requirement: Lista completa de categorias
O sistema SHALL listar numa única página todas as categorias devolvidas pela API, ativas e inativas, sem paginação e na ordem da API (por nome). Cada item MUST mostrar o nome, o estado e as ações "Renomear" e "Desativar" (se ativa) ou "Ativar" (se inativa), com nomes acessíveis que incluam o nome da categoria.

#### Scenario: Ativas e inativas juntas
- **WHEN** existem a categoria ativa "Acesso" e a inativa "Hardware"
- **THEN** a lista mostra "Acesso" e depois "Hardware", com "Desativar" em "Acesso" e "Ativar" em "Hardware", e "Renomear" nas duas

#### Scenario: Nome acessível das ações
- **WHEN** um leitor de tela percorre o item "Acesso"
- **THEN** os botões são anunciados como "Renomear Acesso" e "Desativar Acesso"

### Requirement: Estado da categoria com texto e cor
O sistema SHALL indicar o estado de cada categoria com o texto "Ativa" ou "Inativa" junto de uma cor distinta, nunca só pela cor, legível nos temas claro e escuro.

#### Scenario: Categoria inativa
- **WHEN** a lista exibe uma categoria com `active: false`
- **THEN** o item mostra o rótulo "Inativa" com a cor de estado inativo

### Requirement: Desativar substitui a exclusão
O sistema MUST NOT oferecer ação de excluir categoria, porque a API não exclui. A página SHALL explicar, de forma permanente, que uma categoria inativa não aparece para quem abre chamados e que os chamados que já a usam continuam com ela.

#### Scenario: Nenhuma opção de exclusão
- **WHEN** o administrador abre `/categorias`
- **THEN** nenhum item oferece "Excluir" e a página mostra o texto "Categorias inativas não aparecem para quem abre chamados. Os chamados que já usam a categoria continuam com ela."

### Requirement: Nenhuma categoria cadastrada
Se a API devolver uma lista vazia, o sistema SHALL exibir no lugar da lista a mensagem "Nenhuma categoria cadastrada ainda. Crie a primeira para que os clientes possam abrir chamados." e manter o botão "Nova categoria".

#### Scenario: Lista vazia
- **WHEN** o administrador abre `/categorias` e `GET /categories` devolve `[]`
- **THEN** a página mostra a mensagem de lista vazia e o botão "Nova categoria"

### Requirement: Falha ao carregar as categorias
Se a API falhar ao listar as categorias (rede, 5xx ou erro diferente de 401), o sistema SHALL exibir "Não foi possível carregar as categorias." e a opção "Tentar novamente", sem a lista e sem o botão "Nova categoria". Em 401, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: API fora do ar ao abrir a página
- **WHEN** o administrador abre `/categorias` e `GET /categories` não responde
- **THEN** a página mostra "Não foi possível carregar as categorias." e o botão "Tentar novamente"

#### Scenario: Tentar novamente com a API de volta
- **WHEN** o administrador aciona "Tentar novamente" e a API responde
- **THEN** a página mostra a lista de categorias

### Requirement: Criar categoria
O botão "Nova categoria" SHALL abrir um diálogo "Nova categoria" com o campo vazio "Nome" e os botões "Criar" e "Cancelar". Quando a API criar a categoria, o diálogo MUST fechar, a lista MUST ser relida da API com a nova categoria ativa e o sistema SHALL anunciar "Categoria criada.".

#### Scenario: Categoria criada
- **WHEN** o administrador abre "Nova categoria", digita "Financeiro" e confirma, e a API responde 201
- **THEN** o diálogo fecha, a lista mostra "Financeiro" como "Ativa" na posição alfabética e a página anuncia "Categoria criada."

#### Scenario: Nome com espaços nas extremidades
- **WHEN** o administrador cria a categoria "  Financeiro  "
- **THEN** a lista mostra "Financeiro", sem os espaços

#### Scenario: Cancelar a criação
- **WHEN** o administrador abre "Nova categoria", digita um nome e aciona "Cancelar"
- **THEN** o diálogo fecha, nenhuma categoria é criada e nenhuma mensagem é anunciada

### Requirement: Renomear categoria
A ação "Renomear" SHALL abrir um diálogo "Renomear categoria" com o campo "Nome" preenchido com o nome atual e os botões "Salvar" e "Cancelar", para categorias ativas e inativas. Quando a API aceitar, o diálogo MUST fechar, a lista MUST ser relida sem alterar o estado da categoria e o sistema SHALL anunciar "Categoria renomeada.".

#### Scenario: Categoria renomeada
- **WHEN** o administrador aciona "Renomear" em "Acesso", troca para "Acesso e senhas" e salva
- **THEN** o diálogo fecha, a lista mostra "Acesso e senhas" com o mesmo estado e a página anuncia "Categoria renomeada."

#### Scenario: Renomear categoria inativa
- **WHEN** o administrador renomeia a categoria inativa "Hardware" para "Equipamentos"
- **THEN** a lista mostra "Equipamentos" como "Inativa" e a página anuncia "Categoria renomeada."

#### Scenario: Nome não alterado
- **WHEN** o administrador abre "Renomear" e salva sem mudar o nome (desconsiderando espaços nas extremidades)
- **THEN** o diálogo fecha sem chamar a API e nenhuma mensagem é anunciada

#### Scenario: Só a caixa das letras muda
- **WHEN** o administrador renomeia "Acesso" para "ACESSO"
- **THEN** o sistema envia o novo nome à API e exibe o resultado que ela devolver

### Requirement: Validação do nome da categoria
O sistema MUST validar o nome no servidor antes de chamar a API, após remover os espaços das extremidades, e SHALL exibir junto ao campo "O nome deve ter entre 2 e 60 caracteres." quando ele tiver menos de 2 ou mais de 60 caracteres. Com o nome inválido, a API MUST NOT ser chamada e o diálogo MUST continuar aberto.

#### Scenario: Nome curto
- **WHEN** o administrador tenta criar a categoria "A"
- **THEN** o campo "Nome" mostra "O nome deve ter entre 2 e 60 caracteres.", o diálogo continua aberto e nenhuma categoria é criada

#### Scenario: Nome só com espaços
- **WHEN** o administrador tenta salvar um nome com apenas espaços
- **THEN** o campo "Nome" mostra "O nome deve ter entre 2 e 60 caracteres."

#### Scenario: Nome longo
- **WHEN** o formulário é enviado com um nome de 61 caracteres
- **THEN** o campo "Nome" mostra "O nome deve ter entre 2 e 60 caracteres." e a API não é chamada

### Requirement: Nome duplicado
Se a API recusar o nome com 409 ao criar ou renomear, o sistema SHALL exibir no campo "Nome" a mensagem "Já existe uma categoria com esse nome.", manter o diálogo aberto com o valor digitado e MUST NOT bloquear por conta própria nomes que a API aceitaria (a unicidade diferencia maiúsculas de minúsculas).

#### Scenario: Criar com nome existente
- **WHEN** existe "Acesso" e o administrador tenta criar "Acesso"
- **THEN** o campo "Nome" mostra "Já existe uma categoria com esse nome.", o diálogo continua aberto com "Acesso" no campo e a lista não muda

#### Scenario: Renomear para nome existente
- **WHEN** existem "Acesso" e "Rede" e o administrador tenta renomear "Rede" para "Acesso"
- **THEN** o campo "Nome" mostra "Já existe uma categoria com esse nome." e "Rede" continua com o nome original

#### Scenario: Mesmo nome com outra caixa
- **WHEN** existe "Acesso" e o administrador cria "ACESSO" e a API responde 201
- **THEN** a lista mostra as duas categorias e a página anuncia "Categoria criada."

### Requirement: Ativar e desativar categoria
As ações "Desativar" e "Ativar" SHALL alterar o estado da categoria na API sem pedir confirmação, porque são reversíveis. Depois da resposta, a lista MUST ser relida, o item MUST mostrar o novo estado e a ação oposta, e o sistema SHALL anunciar "Categoria desativada." ou "Categoria ativada.".

#### Scenario: Desativar categoria
- **WHEN** o administrador aciona "Desativar" na categoria ativa "Hardware"
- **THEN** sem diálogo de confirmação, o item passa a mostrar "Inativa" e a ação "Ativar", e a página anuncia "Categoria desativada."

#### Scenario: Categoria desativada some da abertura de chamados
- **WHEN** o administrador desativa "Hardware" e um cliente abre `/chamados/novo` em seguida
- **THEN** "Hardware" não aparece entre as opções de categoria do cliente

#### Scenario: Ativar categoria
- **WHEN** o administrador aciona "Ativar" na categoria inativa "Hardware"
- **THEN** o item passa a mostrar "Ativa" e a ação "Desativar", e a página anuncia "Categoria ativada."

### Requirement: Retorno das ações anunciado
O sistema SHALL exibir a mensagem de resultado de cada ação numa região da página anunciada a leitores de tela (`role="status"`), fora do diálogo, e MUST trocá-la pela mensagem da ação seguinte. Os erros de ativar e desativar MUST aparecer no mesmo lugar, como alerta (`role="alert"`).

#### Scenario: Mensagem anunciada
- **WHEN** o administrador desativa uma categoria
- **THEN** "Categoria desativada." aparece na região de status e é anunciada pelo leitor de tela

#### Scenario: Nova ação substitui a mensagem
- **WHEN** depois de "Categoria desativada." o administrador ativa outra categoria
- **THEN** a região passa a mostrar só "Categoria ativada."

### Requirement: Categoria não encontrada
Se a API responder 404 ao renomear, ativar ou desativar, o sistema SHALL fechar o diálogo, se houver, reler a lista e exibir "Esta categoria não foi encontrada. A lista foi atualizada.".

#### Scenario: Categoria inexistente ao renomear
- **WHEN** o administrador salva um novo nome e a API responde 404
- **THEN** o diálogo fecha, a lista é relida e a página mostra "Esta categoria não foi encontrada. A lista foi atualizada."

#### Scenario: Categoria inexistente ao desativar
- **WHEN** o administrador aciona "Desativar" e a API responde 404
- **THEN** a lista é relida e a página mostra "Esta categoria não foi encontrada. A lista foi atualizada."

### Requirement: Erros da API na administração de categorias
O sistema SHALL tratar as demais respostas de `POST /categories` e `PATCH /categories/{id}` sem exibir texto técnico nem mensagens da API em inglês: 400 sobre o nome mostra a mensagem de tamanho no campo, e outro 400 mostra "Verifique os dados informados."; 403 mostra "Você não tem permissão para esta ação."; rede ou 5xx mostra "Não foi possível conectar ao servidor. Tente novamente em instantes.". No diálogo, o erro aparece dentro dele, que continua aberto.

#### Scenario: Validação recusada pela API
- **WHEN** a API responde 400 com `name must be longer than or equal to 2 characters`
- **THEN** o campo "Nome" mostra "O nome deve ter entre 2 e 60 caracteres."

#### Scenario: Papel alterado durante a sessão
- **WHEN** a API responde 403 ao criar uma categoria
- **THEN** o diálogo mostra "Você não tem permissão para esta ação." e mantém o nome digitado

#### Scenario: API indisponível ao desativar
- **WHEN** o administrador aciona "Desativar" e a API não responde
- **THEN** a página mostra "Não foi possível conectar ao servidor. Tente novamente em instantes." e a categoria continua como "Ativa"

### Requirement: Sessão expirada na administração de categorias
Se `POST /categories` ou `PATCH /categories/{id}` responder 401, o sistema MUST renovar a sessão uma vez e repetir a requisição. Se a renovação falhar, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: Access token expirado ao criar
- **WHEN** a criação recebe 401 e o refresh token ainda é válido
- **THEN** o sistema renova a sessão, repete a criação uma única vez e a categoria é criada

#### Scenario: Refresh token inválido ao desativar
- **WHEN** a desativação recebe 401 e a renovação da sessão também falha
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente." e a categoria não muda

### Requirement: Envio único nas ações de categoria
Enquanto uma ação estiver em andamento, o botão que a disparou SHALL ficar desabilitado com o texto de envio ("Criando...", "Salvando...", "Desativando..." ou "Ativando..."), impedindo um segundo envio, e o estado de envio MUST ser anunciado a leitores de tela. Durante uma ativação ou desativação, as demais ações de ativar e desativar da lista MUST ficar desabilitadas.

#### Scenario: Duplo clique ao criar
- **WHEN** o administrador clica duas vezes seguidas em "Criar"
- **THEN** apenas uma categoria é criada

#### Scenario: Duplo clique ao desativar
- **WHEN** o administrador clica duas vezes seguidas em "Desativar"
- **THEN** apenas uma requisição é enviada e a categoria termina como "Inativa"

### Requirement: Valor preservado após erro no diálogo
Depois de qualquer erro de validação ou da API no diálogo, o sistema SHALL manter o diálogo aberto com o nome exatamente como foi digitado e o foco no campo "Nome".

#### Scenario: Erro de duplicidade
- **WHEN** o administrador digita "Acesso " e a API responde 409
- **THEN** o campo "Nome" continua com "Acesso ", marcado com o erro e com o foco

### Requirement: Diálogo de nome acessível
O diálogo MUST ter título visível ligado a ele, levar o foco ao campo "Nome" ao abrir, prender o foco enquanto aberto, fechar com Esc ou "Cancelar" sem salvar e devolver o foco ao botão que o abriu ("Nova categoria" ou o "Renomear" do item). Ao abrir de novo, MUST começar sem mensagens de erro anteriores.

#### Scenario: Fechar com Esc
- **WHEN** o diálogo "Renomear categoria" de "Acesso" está aberto e o administrador pressiona Esc
- **THEN** o diálogo fecha, o nome não muda e o foco volta ao botão "Renomear Acesso"

#### Scenario: Foco depois de salvar
- **WHEN** o administrador cria uma categoria com sucesso
- **THEN** o foco volta ao botão "Nova categoria"

#### Scenario: Reabrir depois de um erro
- **WHEN** o administrador recebe "Já existe uma categoria com esse nome.", cancela e abre "Nova categoria" de novo
- **THEN** o diálogo abre com o campo vazio e sem mensagem de erro

### Requirement: Página de categorias responsiva
A página MUST ser responsiva (mobile-first), sem scroll horizontal em 360px, com botões de pelo menos 44px de altura e nomes longos quebrando linha sem empurrar as ações para fora da tela. No mobile, cada categoria SHALL aparecer como um cartão com nome e estado acima das ações. A partir de `md`, nome, estado e ações SHALL ficar na mesma linha. O diálogo MUST caber em 360px. A página MUST seguir os temas claro e escuro.

#### Scenario: Lista no mobile
- **WHEN** `/categorias` é aberta em 360px com uma categoria de 60 caracteres
- **THEN** cada item mostra nome e estado acima dos botões, o nome quebra linha, os botões têm pelo menos 44px de altura e não há scroll horizontal

#### Scenario: Lista no desktop
- **WHEN** `/categorias` é aberta em 1280px
- **THEN** cada item mostra nome, estado e ações na mesma linha, num painel com os tokens do design system

#### Scenario: Diálogo no mobile
- **WHEN** o diálogo "Nova categoria" é aberto em 360px
- **THEN** ele cabe na largura da tela, com campo e botões de pelo menos 44px

#### Scenario: Tema escuro
- **WHEN** o sistema operacional está em modo escuro
- **THEN** a lista, os rótulos "Ativa" e "Inativa" e o diálogo usam as cores do tema escuro, com texto legível
