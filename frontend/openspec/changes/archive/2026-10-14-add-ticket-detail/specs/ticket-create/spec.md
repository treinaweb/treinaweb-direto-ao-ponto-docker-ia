# Spec Delta

## MODIFIED Requirements

### Requirement: Confirmação após abrir
Quando a API criar o chamado, o sistema SHALL levar o cliente ao detalhe do chamado criado (`/chamados/{id}`) com o aviso "Chamado aberto.", anunciado a leitores de tela. O chamado SHALL aparecer com status "Aberto" e "Na fila" como atendente.

#### Scenario: Chamado criado
- **WHEN** o cliente envia título, descrição, prioridade e categoria válidos e a API responde 201
- **THEN** o sistema exibe `/chamados/{id}` do chamado novo com o aviso "Chamado aberto.", o status "Aberto" e "Na fila" como atendente

#### Scenario: Aviso não é injetável
- **WHEN** alguém acessa um chamado com um código de aviso desconhecido na URL
- **THEN** nenhum aviso é exibido e nenhum texto da URL é renderizado
