# Spec Delta

## MODIFIED Requirements

### Requirement: Páginas em construção
O sistema SHALL exibir, nas páginas cujo conteúdo ainda não foi construído (`/usuarios`), o título da página, o texto "Esta página estará disponível em breve." e um link "Voltar ao painel". Em `/chamados/{id}`, um identificador que não seja UUID MUST resultar na página "não encontrado".

#### Scenario: Página ainda não construída
- **WHEN** o administrador clica em "Usuários"
- **THEN** o sistema exibe o título "Usuários", o texto "Esta página estará disponível em breve." e o link "Voltar ao painel"

#### Scenario: Identificador de chamado inválido
- **WHEN** o usuário acessa `/chamados/abc`
- **THEN** o sistema exibe a página "não encontrado"
