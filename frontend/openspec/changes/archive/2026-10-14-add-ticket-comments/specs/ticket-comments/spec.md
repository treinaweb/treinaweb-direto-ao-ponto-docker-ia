# Spec Delta

## Purpose

Conversa de um chamado do TreinaDesk no detalhe do chamado: leitura dos comentários e das notas internas visíveis ao papel e envio de novos comentários sem oferecer o que a API recusaria, com validação, mensagens e tratamento de erros.

## ADDED Requirements

### Requirement: Conversa no detalhe do chamado
O sistema SHALL exibir em `/chamados/{id}`, logo abaixo da descrição, a seção "Comentários" com a conversa inteira do chamado, do comentário mais antigo para o mais recente, sem paginação na tela. Sem comentários visíveis ao usuário, a seção MUST mostrar "Nenhum comentário ainda.".

#### Scenario: Conversa com vários comentários
- **WHEN** o usuário abre um chamado com três comentários
- **THEN** a seção "Comentários" aparece abaixo da descrição com os três, o mais antigo primeiro

#### Scenario: Conversa com mais de uma página na API
- **WHEN** o usuário abre um chamado com 150 comentários
- **THEN** a página mostra os 150 comentários em ordem, sem controles de paginação

#### Scenario: Chamado sem comentários
- **WHEN** o usuário abre um chamado que ainda não tem comentários
- **THEN** a seção "Comentários" mostra "Nenhum comentário ainda."

### Requirement: Dados de cada comentário
Cada comentário SHALL mostrar o nome do autor, o selo "Equipe" quando o autor for `SUPPORT` ou `ADMIN` ou "Cliente" quando for `CUSTOMER`, e a data e a hora de criação no formato "14/10/2026, 12:30" (horário de Brasília). O selo MUST ser texto, nunca só cor.

#### Scenario: Resposta do atendente
- **WHEN** o atendente Bruno comentou às 12:30 de 14/10/2026
- **THEN** o comentário mostra "Bruno", o selo "Equipe" e "14/10/2026, 12:30"

#### Scenario: Comentário do cliente
- **WHEN** a cliente Ana comentou no próprio chamado
- **THEN** o comentário mostra "Ana" e o selo "Cliente"

### Requirement: Comentário exibido como texto
O texto de cada comentário MUST ser exibido como texto simples, preservando as quebras de linha, sem interpretar HTML ou marcação, e textos longos sem espaço MUST quebrar sem causar scroll horizontal.

#### Scenario: Comentário com marcação
- **WHEN** um comentário contém `<b>urgente</b>` e duas quebras de linha
- **THEN** a página mostra o texto `<b>urgente</b>` literalmente e mantém as quebras de linha

#### Scenario: Palavra muito longa
- **WHEN** um comentário contém uma URL de 300 caracteres sem espaços, vista em 360px de largura
- **THEN** o texto quebra dentro do comentário e a página não tem scroll horizontal

### Requirement: Notas internas visíveis só para a equipe
As notas internas SHALL aparecer para `SUPPORT` e `ADMIN` na posição cronológica da conversa, com fundo próprio e o rótulo "Nota interna" em texto. O `CUSTOMER` MUST NOT ver notas internas nem qualquer indício delas.

#### Scenario: Equipe vê a nota interna
- **WHEN** o atendente atribuído abre um chamado com uma resposta ao cliente e uma nota interna
- **THEN** a nota interna aparece com o rótulo "Nota interna" e fundo diferente da resposta ao cliente

#### Scenario: Cliente não vê a nota interna
- **WHEN** o cliente dono abre o mesmo chamado
- **THEN** a conversa mostra só a resposta ao cliente, sem a nota interna nem o rótulo "Nota interna"

### Requirement: Conversa muito longa
Quando a conversa tiver mais de 2.000 comentários, o sistema SHALL exibir os 2.000 mais recentes, do mais antigo para o mais recente, precedidos do aviso "Esta conversa tem {total} comentários. Exibindo os 2.000 mais recentes.".

#### Scenario: Conversa acima do limite
- **WHEN** o usuário abre um chamado com 2.150 comentários
- **THEN** a página mostra o aviso "Esta conversa tem 2.150 comentários. Exibindo os 2.000 mais recentes." e os 2.000 comentários mais recentes, terminando no último

### Requirement: Falha ao carregar a conversa
Se a API falhar ao devolver os comentários (rede, 5xx ou outro erro que não seja 401), a seção "Comentários" SHALL mostrar "Não foi possível carregar os comentários." e "Tentar novamente", sem detalhes técnicos, e o restante do chamado MUST continuar visível e utilizável. Em 401, MUST levar ao login com o aviso "Sua sessão expirou. Entre novamente.".

#### Scenario: Comentários indisponíveis
- **WHEN** `GET /tickets/{id}/comments` falha e `GET /tickets/{id}` responde normalmente
- **THEN** a página mostra o chamado com informações, descrição e ações, e a seção "Comentários" mostra "Não foi possível carregar os comentários." e "Tentar novamente"

#### Scenario: Sessão expirada ao ler a conversa
- **WHEN** `GET /tickets/{id}/comments` responde 401
- **THEN** o usuário vai para `/login` com o aviso "Sua sessão expirou. Entre novamente."

### Requirement: Somente quem pode comentar vê o campo
O sistema MUST exibir o campo de comentário apenas quando a API aceitaria o comentário, conforme papel, relação com o chamado e status. Um campo que a API recusaria MUST NOT aparecer, nem desabilitado. O campo SHALL ficar abaixo da conversa.

#### Scenario: Cliente dono com chamado em andamento
- **WHEN** o cliente abre o próprio chamado "Em andamento"
- **THEN** o campo de comentário aparece abaixo da conversa

#### Scenario: Cliente dono com chamado resolvido
- **WHEN** o cliente abre o próprio chamado "Resolvido"
- **THEN** o campo de comentário aparece, junto com as ações "Reabrir" e "Fechar chamado"

#### Scenario: Atendente atribuído
- **WHEN** o atendente atribuído abre um chamado "Aguardando cliente"
- **THEN** o campo de comentário aparece

#### Scenario: Administrador num chamado da fila
- **WHEN** um `ADMIN` abre um chamado "Aberto" sem atendente
- **THEN** o campo de comentário aparece

### Requirement: Atendente não atribuído
Para o `SUPPORT` que não é o atendente atribuído, o sistema SHALL mostrar a conversa e, no lugar do campo de comentário, o texto "Assuma o chamado para responder.".

#### Scenario: Atendente lê um chamado da fila
- **WHEN** um `SUPPORT` abre um chamado "Aberto" sem atendente que tem um comentário do cliente
- **THEN** a página mostra o comentário, o texto "Assuma o chamado para responder." e nenhum campo de comentário

#### Scenario: Atendente assume e passa a responder
- **WHEN** esse `SUPPORT` aciona "Assumir"
- **THEN** o texto "Assuma o chamado para responder." some e o campo de comentário aparece

### Requirement: Chamado fechado não aceita comentários
Num chamado "Fechado", o sistema SHALL mostrar a conversa e, no lugar do campo de comentário, o texto "Chamado fechado não aceita novos comentários.", para qualquer papel.

#### Scenario: Cliente com chamado fechado
- **WHEN** o cliente abre o próprio chamado "Fechado"
- **THEN** a página mostra a conversa e "Chamado fechado não aceita novos comentários.", sem campo de comentário

#### Scenario: Administrador com chamado fechado
- **WHEN** um `ADMIN` abre um chamado "Fechado"
- **THEN** a página mostra "Chamado fechado não aceita novos comentários.", sem campo de comentário

### Requirement: Resposta ao cliente por padrão
O envio SHALL ser uma resposta visível ao cliente, a menos que o usuário marque a opção "Nota interna (visível só para a equipe)". A opção MUST aparecer só para `SUPPORT` e `ADMIN`, desmarcada a cada novo comentário, e o botão de envio SHALL dizer "Enviar resposta" ou, com a opção marcada, "Adicionar nota interna".

#### Scenario: Atendente responde ao cliente
- **WHEN** o atendente atribuído escreve um texto e aciona "Enviar resposta" sem marcar a opção
- **THEN** o comentário é criado como resposta ao cliente e o cliente passa a vê-lo

#### Scenario: Atendente adiciona nota interna
- **WHEN** o atendente atribuído marca "Nota interna (visível só para a equipe)" e aciona "Adicionar nota interna"
- **THEN** o comentário aparece na conversa com o rótulo "Nota interna" e o cliente não o vê

#### Scenario: Cliente não vê a opção
- **WHEN** o cliente dono vê o campo de comentário
- **THEN** a opção "Nota interna (visível só para a equipe)" não aparece e o botão diz "Enviar resposta"

### Requirement: Validação do comentário
O texto do comentário MUST ter de 1 a 5000 caracteres depois de remover os espaços das extremidades, validado antes de chamar a API. Vazio ou só com espaços mostra "Escreva um comentário." e acima do limite mostra "O comentário deve ter no máximo 5000 caracteres.", no próprio campo.

#### Scenario: Comentário só com espaços
- **WHEN** o usuário envia um comentário com apenas espaços
- **THEN** o campo mostra "Escreva um comentário." e nada é enviado à API

#### Scenario: Comentário acima do limite
- **WHEN** o usuário envia um comentário com 5001 caracteres depois do trim
- **THEN** o campo mostra "O comentário deve ter no máximo 5000 caracteres." e nada é enviado à API

#### Scenario: Espaços nas extremidades
- **WHEN** o usuário envia "  Obrigado!  "
- **THEN** o comentário aparece como "Obrigado!"

### Requirement: Resultado do envio
Depois de um comentário aceito, o sistema SHALL recarregar o chamado e a conversa, exibir o novo comentário no fim da conversa, limpar o campo, desmarcar a opção de nota interna e mostrar "Resposta enviada." ou "Nota interna adicionada.", anunciado a leitores de tela. O foco MUST voltar ao campo de comentário.

#### Scenario: Cliente responde
- **WHEN** o cliente envia "Segue o print do erro." num chamado "Em andamento"
- **THEN** o comentário aparece no fim da conversa com o selo "Cliente", o campo fica vazio e a página mostra "Resposta enviada."

#### Scenario: Nota interna adicionada
- **WHEN** o administrador envia uma nota interna
- **THEN** a nota aparece no fim da conversa com o rótulo "Nota interna", a opção volta a ficar desmarcada e a página mostra "Nota interna adicionada."

### Requirement: Status atualizado depois de comentar
Depois de um comentário aceito, o sistema SHALL exibir o status, as datas, os avisos e as ações do chamado como a API os devolve. A resposta do cliente dono num chamado "Aguardando cliente" MUST aparecer com o chamado "Em andamento". Num chamado "Resolvido", o comentário do cliente MUST NOT ser apresentado como reabertura.

#### Scenario: Cliente responde a um chamado aguardando
- **WHEN** o cliente dono comenta no próprio chamado "Aguardando cliente"
- **THEN** o chip passa a "Em andamento", o aviso de resposta aguardada some e a página mostra "Resposta enviada."

#### Scenario: Cliente comenta num chamado resolvido
- **WHEN** o cliente dono comenta no próprio chamado "Resolvido"
- **THEN** o chip continua "Resolvido", as ações "Reabrir" e "Fechar chamado" continuam disponíveis e a página mostra "Resposta enviada."

### Requirement: Envio único do comentário
Enquanto um comentário estiver sendo enviado, o sistema SHALL desabilitar o botão de envio e indicar o envio nele ("Enviando..." ou "Adicionando..."), impedindo um segundo envio do mesmo texto.

#### Scenario: Duplo clique em Enviar resposta
- **WHEN** o usuário clica duas vezes seguidas em "Enviar resposta"
- **THEN** apenas uma requisição de criação de comentário é enviada e o comentário aparece uma única vez

### Requirement: Texto preservado em caso de erro
Quando o envio falhar e o campo continuar disponível, o sistema MUST manter o texto digitado e o estado da opção de nota interna, para o usuário corrigir ou reenviar.

#### Scenario: API indisponível no envio
- **WHEN** o usuário envia um comentário e a API não responde
- **THEN** a página mostra "Não foi possível conectar ao servidor. Tente novamente em instantes." e o campo continua com o texto digitado

### Requirement: Comentário recusado pela regra do chamado
Se a API responder 422 ao comentário, o sistema SHALL recarregar o chamado e a conversa, exibir o campo ou o texto que vale para o novo estado e explicar a regra: "Este chamado foi fechado e não aceita novos comentários." quando o chamado foi fechado, "Apenas o atendente atribuído pode comentar neste chamado." quando o usuário deixou de ser o atendente, e "Não é possível comentar na situação atual do chamado." nos demais casos. Nenhuma mensagem da API MUST ser exibida.

#### Scenario: Chamado fechado durante a escrita
- **WHEN** o cliente escreve um comentário, outra sessão fecha o chamado e o cliente envia, recebendo 422
- **THEN** a página mostra o chamado "Fechado", "Este chamado foi fechado e não aceita novos comentários." e "Chamado fechado não aceita novos comentários." no lugar do campo

#### Scenario: Atendente deixou de ser o atribuído
- **WHEN** o atendente envia um comentário e a API responde 422 porque ele não é mais o atendente atribuído
- **THEN** a página mostra o chamado recarregado e "Apenas o atendente atribuído pode comentar neste chamado."

### Requirement: Chamado alterado durante o envio
Se a API responder 409 ao comentário, o sistema SHALL recarregar o chamado e a conversa, manter o texto digitado e mostrar "Este chamado foi alterado por outra pessoa. Confira a conversa e tente novamente.".

#### Scenario: Status mudou durante a retomada automática
- **WHEN** o cliente responde a um chamado "Aguardando cliente" enquanto o atendente muda o status, e a API responde 409
- **THEN** a página mostra o chamado e a conversa recarregados, a mensagem de alteração por outra pessoa e o campo com o texto digitado

### Requirement: Chamado indisponível durante o envio
Se a API responder 404 ao comentário, o sistema SHALL mostrar, no lugar do campo, "Este chamado não está mais disponível para você." e o link "Voltar aos chamados".

#### Scenario: Atendente perdeu o chamado
- **WHEN** um administrador reatribui o chamado e o atendente anterior, com a página ainda aberta, envia um comentário e recebe 404
- **THEN** a página mostra "Este chamado não está mais disponível para você." e o link "Voltar aos chamados"

### Requirement: Demais erros do envio
O sistema SHALL tratar os demais erros sem texto técnico nem mensagens da API: 403 mostra "Você não tem permissão para esta ação.", 400 mostra a mensagem do campo de comentário ou, sem campo identificado, "Verifique os dados informados.", e rede ou 5xx mostra "Não foi possível conectar ao servidor. Tente novamente em instantes.". Em 401, MUST renovar a sessão uma vez e repetir o envio; se a renovação falhar, MUST levar ao login.

#### Scenario: Nota interna recusada
- **WHEN** um envio de nota interna recebe 403
- **THEN** a página mostra "Você não tem permissão para esta ação." e o campo continua com o texto digitado

#### Scenario: Validação recusada pela API
- **WHEN** a API responde 400 com uma mensagem sobre o `body`
- **THEN** o campo mostra "Escreva um comentário." ou "O comentário deve ter no máximo 5000 caracteres.", conforme a regra, e nenhuma mensagem em inglês é exibida

#### Scenario: Access token expirado no envio
- **WHEN** o envio recebe 401 e o refresh token ainda é válido
- **THEN** o sistema renova a sessão, envia o comentário uma única vez e mostra "Resposta enviada."

### Requirement: Conversa acessível
A seção "Comentários" SHALL ser uma região nomeada, com a conversa como lista em ordem e a data de cada comentário legível por máquina. O campo MUST ter rótulo "Comentário", a opção de nota interna MUST ser uma caixa de seleção com rótulo, os erros MUST ficar ligados ao campo e o resultado do envio MUST ser anunciado numa região viva.

#### Scenario: Leitor de tela na conversa
- **WHEN** um usuário de leitor de tela chega à seção "Comentários"
- **THEN** ele ouve o nome da região, a quantidade de itens da lista e, em cada item, o autor, o selo, a data e, se houver, "Nota interna"

#### Scenario: Erro de validação anunciado
- **WHEN** o usuário envia um comentário vazio
- **THEN** o campo fica marcado como inválido, a mensagem "Escreva um comentário." fica associada a ele e o foco vai para o campo

### Requirement: Conversa responsiva
A conversa e o campo MUST ser responsivos (mobile-first), sem scroll horizontal em 360px, com botão de envio e caixa de seleção de pelo menos 44px de área de toque e suporte aos temas claro e escuro, mantendo a nota interna distinguível nos dois. Abaixo de `lg`, SHALL vir depois da descrição, em coluna única e com o botão na largura disponível. A partir de `lg`, SHALL ocupar a coluna da descrição, à esquerda do painel lateral.

#### Scenario: Conversa no mobile
- **WHEN** um chamado com comentários e nota interna é aberto em 360px de largura
- **THEN** a conversa aparece depois da descrição, o botão de envio ocupa a largura disponível e não há scroll horizontal

#### Scenario: Conversa no desktop
- **WHEN** um chamado é aberto em 1280px de largura
- **THEN** a conversa e o campo ficam abaixo da descrição, na coluna à esquerda do painel com informações e ações

#### Scenario: Tema escuro
- **WHEN** o atendente vê uma conversa com nota interna no tema escuro
- **THEN** a nota interna continua com fundo distinto, o rótulo "Nota interna" e texto com contraste legível
