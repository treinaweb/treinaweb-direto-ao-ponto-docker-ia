# Spec Delta

## MODIFIED Requirements

### Requirement: Aviso ao cliente aguardando resposta
Quando o chamado do cliente estiver "Aguardando cliente", o sistema SHALL exibir ao `CUSTOMER` o aviso "O atendimento aguarda sua resposta. Responda pelos comentários abaixo." com a opção "Responder", que leva ao campo de comentário e coloca o foco nele. O aviso MUST deixar de aparecer quando o chamado sair de "Aguardando cliente".

#### Scenario: Chamado aguardando o cliente
- **WHEN** o cliente abre o próprio chamado "Aguardando cliente"
- **THEN** a página mostra o aviso "O atendimento aguarda sua resposta. Responda pelos comentários abaixo.", a opção "Responder", nenhuma ação e o campo de comentário

#### Scenario: Cliente aciona Responder
- **WHEN** o cliente aciona "Responder" no aviso, numa tela de 360px
- **THEN** a página rola até o campo de comentário e o foco fica nele

#### Scenario: Aviso some depois da resposta
- **WHEN** o cliente envia um comentário e o chamado passa a "Em andamento"
- **THEN** o aviso de resposta aguardada deixa de ser exibido
