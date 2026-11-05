# account-signup Specification

## Purpose

Permite que um visitante crie publicamente sua conta de cliente (`CUSTOMER`) no TreinaDesk e já entre na aplicação logado, sem precisar repetir as credenciais na tela de login.

## Requirements

### Requirement: Formulário de criação de conta
O sistema SHALL oferecer em `/cadastro` um formulário com os campos "Nome", "E-mail", "Senha" e "Confirmar senha", com um link para `/login` ("Já tem conta? Entrar"). A tela de login MUST ter o link inverso ("Não tem conta? Criar conta").

#### Scenario: Navegação entre login e cadastro
- **WHEN** o visitante clica em "Criar conta" na tela `/login`
- **THEN** o sistema exibe o formulário de `/cadastro`, que por sua vez oferece o link "Entrar" de volta

### Requirement: Validação do cadastro
O sistema MUST validar os dados no servidor antes de chamar a API, com mensagens em pt-BR junto a cada campo e preservando os valores digitados (exceto as senhas). Regras: nome com 2 a 100 caracteres após remover espaços das extremidades; e-mail obrigatório, com formato válido e no máximo 200 caracteres, normalizado para minúsculas e sem espaços nas extremidades; senha com 8 a 128 caracteres; confirmação igual à senha.

#### Scenario: Nome curto demais
- **WHEN** o visitante informa o nome "A"
- **THEN** o sistema exibe "O nome deve ter entre 2 e 100 caracteres." e não chama a API

#### Scenario: E-mail inválido
- **WHEN** o visitante informa `ana.teste.com` como e-mail
- **THEN** o sistema exibe "Informe um e-mail válido." e não chama a API

#### Scenario: Senha curta demais
- **WHEN** o visitante informa uma senha com 7 caracteres
- **THEN** o sistema exibe "A senha deve ter entre 8 e 128 caracteres." e não chama a API

#### Scenario: Confirmação diferente
- **WHEN** a confirmação de senha é diferente da senha
- **THEN** o sistema exibe "As senhas não conferem." no campo "Confirmar senha" e não chama a API

#### Scenario: E-mail normalizado
- **WHEN** o visitante informa `  Ana@Teste.COM ` como e-mail
- **THEN** o sistema envia `ana@teste.com` à API

#### Scenario: API rejeita o corpo (400)
- **WHEN** a API responde 400 ao cadastro
- **THEN** o sistema exibe as mensagens de validação em pt-BR nos campos correspondentes ou, se não for possível associá-las a um campo, um alerta genérico "Verifique os dados informados."

### Requirement: E-mail já cadastrado
O sistema SHALL informar no campo e-mail quando a API indicar que o endereço já está em uso, sem criar uma nova conta.

#### Scenario: Cadastro com e-mail existente (409)
- **WHEN** o visitante tenta criar conta com um e-mail já cadastrado e a API responde 409
- **THEN** o sistema exibe "Este e-mail já está cadastrado." no campo e-mail, mantém nome e e-mail preenchidos e oferece o link para entrar

### Requirement: Conta sempre de cliente
O sistema SHALL criar pelo cadastro público apenas contas de cliente; o formulário MUST NOT oferecer escolha de papel.

#### Scenario: Papel da nova conta
- **WHEN** um visitante conclui o cadastro
- **THEN** a conta criada tem o papel `CUSTOMER` e o dashboard exibe o papel "Cliente"

### Requirement: Entrada automática após o cadastro
O sistema SHALL, após criar a conta, autenticar o usuário com as mesmas credenciais e levá-lo direto ao `/dashboard`, com a sessão estabelecida nas mesmas regras da capability `auth-session` (cookies httpOnly, renovação, logout).

#### Scenario: Cadastro concluído
- **WHEN** o visitante envia dados válidos com um e-mail novo
- **THEN** a conta é criada, a sessão é iniciada e o usuário vê `/dashboard` com "Olá, {nome}"

#### Scenario: Conta criada mas login automático falha
- **WHEN** a conta é criada com sucesso mas o login automático falha (erro da API ou falha de rede)
- **THEN** o sistema redireciona para `/login` com o aviso "Conta criada. Entre para continuar." e não tenta criar a conta novamente

### Requirement: Falha de comunicação no cadastro
O sistema SHALL exibir uma mensagem genérica em pt-BR quando a API estiver indisponível ou responder 5xx ao criar a conta, sem expor detalhes internos.

#### Scenario: API fora do ar
- **WHEN** o visitante envia o cadastro e a API não responde ou responde 5xx
- **THEN** o sistema exibe "Não foi possível conectar ao servidor. Tente novamente em instantes." e mantém nome e e-mail preenchidos

### Requirement: Envio único do cadastro
O formulário de cadastro MUST desabilitar o botão "Criar conta" e exibir "Criando conta..." durante o envio, impedindo envios duplicados, e MUST associar as mensagens de erro aos campos de forma acessível.

#### Scenario: Duplo clique em Criar conta
- **WHEN** o visitante clica duas vezes rapidamente em "Criar conta"
- **THEN** apenas uma requisição de criação é feita

### Requirement: Cadastro responsivo
A tela `/cadastro` MUST ser responsiva (mobile-first), sem scroll horizontal em 360px, com campos em uma coluna no mobile, alvos de toque de pelo menos 44px e suporte aos temas claro e escuro.

#### Scenario: Cadastro no mobile
- **WHEN** a tela `/cadastro` é aberta em 360px de largura
- **THEN** os quatro campos ficam em uma coluna, o botão "Criar conta" tem altura mínima de 44px e não há scroll horizontal

#### Scenario: Cadastro no desktop
- **WHEN** a tela `/cadastro` é aberta em 1280px ou mais
- **THEN** o formulário aparece centralizado em um painel com largura limitada, no mesmo layout da tela de login
