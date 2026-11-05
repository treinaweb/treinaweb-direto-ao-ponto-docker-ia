# container-dev-environment Specification

## Purpose

Permite desenvolver o TreinaDesk com a aplicação rodando em containers: o código é editado no host, as alterações aparecem na aplicação em execução e o banco fica isolado do ambiente de produção local.

## Requirements

### Requirement: Subida do ambiente de desenvolvimento
O ambiente SHALL iniciar banco, API e frontend em modo de desenvolvimento com `docker compose -f compose.yaml -f compose.dev.yaml up --build`, a partir de um `.env` preenchido na raiz, publicando o frontend na porta `3001` e a API na porta `3000` do host.

#### Scenario: Primeira subida
- **WHEN** o usuário executa o comando sem volumes de desenvolvimento existentes
- **THEN** `postgres`, `backend` e `frontend` ficam `healthy`
- **AND** `http://localhost:3001/login` e `http://localhost:3000/docs-json` respondem com sucesso

#### Scenario: Segredo ausente
- **WHEN** o usuário executa o comando sem `JWT_ACCESS_SECRET` definido
- **THEN** o comando termina com erro antes de criar containers e a mensagem identifica a variável

#### Scenario: Login em desenvolvimento
- **WHEN** o usuário entra com `ana@teste.com` e a senha `senhaSegura123` em `http://localhost:3001`
- **THEN** o sistema abre a área autenticada e os cookies de sessão não têm o atributo `Secure`

### Requirement: Ambiente de produção como padrão
O comando `docker compose up --build`, sem arquivos adicionais, MUST continuar iniciando o ambiente de produção descrito em `container-runtime`.

#### Scenario: Subida padrão
- **WHEN** o usuário executa `docker compose up --build` na raiz
- **THEN** o frontend executa o servidor de produção e a API executa o código compilado na imagem
- **AND** a imagem final da API continua sem os pacotes `prisma` e `tsx`

### Requirement: Alterações no frontend refletidas em execução
Alterações em arquivos de `frontend/` no host SHALL aparecer na aplicação em execução sem reconstruir a imagem nem recriar o container.

#### Scenario: Página aberta no navegador
- **WHEN** o usuário salva uma alteração visível em um componente da página aberta
- **THEN** o navegador mostra a alteração sem recarga manual

#### Scenario: Arquivo novo
- **WHEN** o usuário cria uma nova página em `frontend/app/`
- **THEN** a nova rota responde sem reiniciar o container

### Requirement: Alterações no backend refletidas em execução
Alterações em arquivos TypeScript de `backend/src/` no host SHALL reiniciar automaticamente o processo da API dentro do mesmo container, sem reconstruir a imagem.

#### Scenario: Alteração em uma rota
- **WHEN** o usuário salva uma alteração em um arquivo usado por uma rota
- **THEN** depois da recompilação, a rota responde com o novo comportamento
- **AND** o container `backend` não é recriado

#### Scenario: Erro de compilação
- **WHEN** o usuário salva código que não compila
- **THEN** os logs do `backend` mostram o erro e o container continua em execução
- **AND** ao corrigir o código, a API volta a responder sem intervenção

### Requirement: Preparo do banco de desenvolvimento
Cada subida SHALL aplicar as migrations presentes em `backend/prisma/migrations` no host e criar ou restaurar o ADMIN e os dados de teste antes de a API iniciar. Uma falha nesse preparo MUST impedir o início da API e do frontend.

#### Scenario: Migration nova no host
- **WHEN** existe no host uma migration ainda não aplicada e o usuário sobe o ambiente sem reconstruir imagens
- **THEN** a migration é aplicada ao banco de desenvolvimento

#### Scenario: Falha no preparo
- **WHEN** a aplicação das migrations ou o seed terminam com erro
- **THEN** o comando informa a falha e a API e o frontend não são iniciados

### Requirement: Isolamento em relação à produção
O ambiente de desenvolvimento MUST usar projeto, containers e volume de banco próprios. Comandos executados nele MUST NOT alterar dados nem containers do ambiente de produção.

#### Scenario: Dados separados
- **WHEN** o usuário cria um ticket em desenvolvimento e depois sobe o ambiente de produção
- **THEN** o ticket não existe em produção

#### Scenario: Remoção do volume de desenvolvimento
- **WHEN** o usuário executa `docker compose -f compose.yaml -f compose.dev.yaml down -v`
- **THEN** os volumes de desenvolvimento são removidos
- **AND** o volume de banco de produção continua existindo

### Requirement: Arquivos gerados disponíveis no host
Arquivos gerados no container dentro das pastas do projeto SHALL ficar disponíveis no host e editáveis pelo usuário.

#### Scenario: Migration criada no container
- **WHEN** o usuário executa `prisma migrate dev` no serviço `backend`
- **THEN** a nova migration aparece em `backend/prisma/migrations` no host, com o usuário do host como dono

#### Scenario: Client do Prisma
- **WHEN** o ambiente sobe
- **THEN** `backend/src/generated/prisma` existe no host, com o client gerado a partir do schema atual

### Requirement: Dependências instaladas em volume
As dependências usadas pelos containers MUST ficar em volumes separados do `node_modules` do host. Ao iniciar, cada serviço de aplicação SHALL reinstalá-las somente se o `package-lock.json` tiver mudado desde a última instalação.

#### Scenario: Dependência nova
- **WHEN** o `package-lock.json` muda no host e o usuário reinicia o serviço, sem reconstruir a imagem
- **THEN** o serviço instala as dependências antes de iniciar a aplicação

#### Scenario: Sem alteração de dependências
- **WHEN** o usuário reinicia o serviço sem mudança no `package-lock.json`
- **THEN** o serviço inicia sem reinstalar as dependências

#### Scenario: Instalação no host
- **WHEN** o usuário executa `npm install` em `backend/` ou `frontend/` no host, para o editor, com o ambiente parado ou em execução
- **THEN** a instalação conclui sem erro de permissão e não altera as dependências usadas pelos containers

### Requirement: Acesso local ao banco de desenvolvimento
O PostgreSQL de desenvolvimento SHALL ser publicado na porta `5432` somente em `127.0.0.1`.

#### Scenario: Conexão pelo host
- **WHEN** uma ferramenta no host conecta a `127.0.0.1:5432` com as credenciais do `.env`
- **THEN** a conexão é aceita e acessa o banco de desenvolvimento

#### Scenario: Publicação restrita
- **WHEN** o ambiente está em execução
- **THEN** `docker compose ps` mostra a porta do PostgreSQL publicada apenas em `127.0.0.1`
