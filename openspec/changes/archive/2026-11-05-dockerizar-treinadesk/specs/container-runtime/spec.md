# Spec Delta

## Purpose

Permite executar o TreinaDesk completo (banco de dados, API e frontend) em containers, com um único comando, a partir de imagens de produção e em um ambiente local reproduzível.

## ADDED Requirements

### Requirement: Subida completa com um único comando
O ambiente SHALL construir as imagens e iniciar banco de dados, API e frontend com `docker compose up --build`, executado na raiz do projeto com um `.env` preenchido, sem Node.js ou PostgreSQL instalados no host.

#### Scenario: Primeira subida em banco vazio
- **WHEN** o usuário executa `docker compose up --build` com um `.env` válido e sem volume de banco existente
- **THEN** `postgres`, `backend` e `frontend` ficam `healthy` em `docker compose ps`
- **AND** `http://localhost:3001/login` responde com a página de login

#### Scenario: Login pelo navegador usando a API em container
- **WHEN** o usuário acessa `http://localhost:3001` e entra com `ana@teste.com` e a senha `senhaSegura123`
- **THEN** o sistema abre a área autenticada e mantém a sessão ao recarregar a página

### Requirement: Ordem de inicialização
Cada serviço MUST iniciar somente depois que suas dependências estiverem prontas: preparo do banco após o PostgreSQL saudável, API após o preparo concluído com sucesso e frontend após a API saudável.

#### Scenario: Serviços aguardam o banco
- **WHEN** o PostgreSQL ainda não aceita conexões
- **THEN** o preparo do banco, a API e o frontend ainda não foram iniciados

#### Scenario: Falha no preparo do banco
- **WHEN** a aplicação das migrations ou o seed terminam com erro
- **THEN** `docker compose up` termina com código diferente de zero e informa a falha
- **AND** a API e o frontend não são iniciados

### Requirement: Preparo do banco a cada subida
A cada subida, o ambiente SHALL aplicar as migrations pendentes e criar ou restaurar o ADMIN configurado e os dados de teste, antes de a API iniciar.

#### Scenario: Dados disponíveis no banco novo
- **WHEN** a primeira subida termina
- **THEN** é possível entrar com o ADMIN do `.env` e com `ana@teste.com`, `bia@teste.com` e `diego@teste.com`
- **AND** as categorias, os tickets e os comentários de teste estão disponíveis

#### Scenario: Dados de teste restaurados
- **WHEN** o usuário altera o papel ou a senha de um usuário de teste e sobe o ambiente novamente
- **THEN** o usuário de teste volta ao papel e à senha definidos no seed

#### Scenario: Migrations já aplicadas
- **WHEN** o ambiente sobe com todas as migrations já aplicadas
- **THEN** o preparo do banco termina com sucesso sem reaplicá-las

### Requirement: Persistência dos dados
Os dados do banco MUST sobreviver à remoção e à recriação dos containers e só SHALL ser apagados por remoção explícita do volume.

#### Scenario: Dados preservados entre subidas
- **WHEN** o usuário cria um ticket, executa `docker compose down` e sobe o ambiente novamente
- **THEN** o ticket criado continua disponível

#### Scenario: Remoção explícita do volume
- **WHEN** o usuário executa `docker compose down -v` e sobe o ambiente novamente
- **THEN** o banco contém somente as migrations, o ADMIN e os dados de teste

### Requirement: Configuração obrigatória explícita
O ambiente MUST recusar a subida quando faltar a senha do banco, o segredo do JWT ou a senha do ADMIN, sem usar valores padrão para esses segredos, e SHALL fornecer um `.env.example` que documente as variáveis.

#### Scenario: Segredo ausente
- **WHEN** o usuário executa `docker compose up` sem `JWT_ACCESS_SECRET` definido ou com valor vazio
- **THEN** o comando termina com erro antes de criar containers e a mensagem identifica a variável ausente

#### Scenario: Ambiente criado a partir do exemplo
- **WHEN** o usuário copia `.env.example` para `.env` e preenche os segredos conforme as instruções do arquivo
- **THEN** `docker compose up --build` conclui a subida

### Requirement: Imagens de produção sem conteúdo indevido
As imagens finais de API e frontend MUST executar com usuário não root e sem arquivos `.env` do host. A imagem final da API MUST NOT conter dependências de desenvolvimento.

#### Scenario: Segredos locais fora da imagem
- **WHEN** existem arquivos `.env` em `backend/` ou `.env.local` em `frontend/` e as imagens são construídas
- **THEN** nenhum desses arquivos está presente nas imagens

#### Scenario: Usuário de execução
- **WHEN** o processo principal da API ou do frontend está em execução
- **THEN** o usuário efetivo do processo não é `root`

#### Scenario: API sem ferramentas de desenvolvimento
- **WHEN** o conteúdo da imagem final da API é inspecionado
- **THEN** os pacotes `prisma` e `tsx` não estão instalados

### Requirement: Endereço da API definido em runtime
A imagem do frontend MUST receber o endereço da API por `API_BASE_URL` em runtime, sem reconstrução, e o navegador MUST NOT chamar a API diretamente.

#### Scenario: Comunicação entre containers
- **WHEN** o usuário usa o frontend no navegador
- **THEN** o frontend alcança a API pelo nome do serviço na rede do compose
- **AND** nenhuma requisição do navegador é enviada à porta `3000`

#### Scenario: Troca de endereço sem rebuild
- **WHEN** um container é criado a partir da mesma imagem do frontend com outro valor de `API_BASE_URL`
- **THEN** as chamadas à API usam o novo endereço

### Requirement: Portas expostas no host
O ambiente SHALL publicar o frontend na porta `3001` e a API na porta `3000` do host, e MUST NOT publicar a porta do PostgreSQL.

#### Scenario: Swagger disponível
- **WHEN** o ambiente está saudável e o usuário acessa `http://localhost:3000/docs-json`
- **THEN** a API responde com o documento OpenAPI

#### Scenario: Banco inacessível pelo host
- **WHEN** o ambiente está saudável
- **THEN** `docker compose ps` não mostra porta do PostgreSQL publicada no host
