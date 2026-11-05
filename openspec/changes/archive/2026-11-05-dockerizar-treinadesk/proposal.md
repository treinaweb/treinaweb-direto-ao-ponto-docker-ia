# Proposal

## Why

Hoje, rodar o TreinaDesk exige instalar Node.js 24 e PostgreSQL, configurar dois `.env` e executar à mão migrations, seed e os dois servidores, cada um em um repositório. Imagens Docker das duas aplicações e um único arquivo de compose reduzem isso a um comando e tornam o ambiente reproduzível.

## What Changes

- Nova imagem Docker de produção do backend (NestJS), sem dependências de desenvolvimento.
- Nova imagem Docker de produção do frontend (Next.js), que recebe `API_BASE_URL` em runtime.
- Nova imagem auxiliar do backend, usada para aplicar migrations e executar o seed.
- Novo `compose.yaml` na raiz de `docker-ia/`, com `postgres`, `migrate`, `backend` e `frontend`, iniciados em ordem por dependências e healthchecks.
- Novo `.env.example` na raiz, com os valores que o ambiente exige; o compose falha com erro claro quando faltar um segredo.
- A cada subida, o serviço `migrate` aplica as migrations e cria ou restaura o ADMIN e os dados de teste. Registros criados pelo usuário e o volume do banco são preservados.
- `frontend/next.config.ts` passa a gerar a saída `standalone`.
- `.dockerignore` em `backend/` e `frontend/`, para que `.env`, `node_modules` e `.git` não entrem nas imagens.

**Fora de escopo**: desenvolvimento dentro de containers (hot reload e bind mounts), HTTPS ou proxy reverso, publicação em registry, CI/CD, múltiplas réplicas do frontend, execução dos testes e2e em containers e nova rota de health na API.

## Capabilities

### New Capabilities

- `container-runtime`: execução do TreinaDesk completo em containers a partir de um único comando, incluindo imagens, orquestração, ordem de inicialização, preparo do banco, configuração e persistência.

### Modified Capabilities

Nenhuma. O OpenSpec da raiz ainda não tem specs, e o comportamento funcional da API e do frontend não muda.

## Impact

- **`docker-ia/` (sem versionamento git, por decisão do usuário)**: novos `compose.yaml`, `.env.example` e `README.md`. O `.env` real também fica aqui. Esses arquivos e os artefatos desta change não têm histórico nem backup.
- **`backend/` (repositório próprio)**: novos `Dockerfile` e `.dockerignore`, sem alteração no código da API.
- **`frontend/` (repositório próprio)**: novos `Dockerfile` e `.dockerignore`, além de `output: "standalone"` em `next.config.ts`.
- **Portas no host**: `3001` (frontend) e `3000` (backend, para o Swagger). Conflitam com as mesmas aplicações rodando fora do Docker. O PostgreSQL não é exposto.
- **Acesso**: previsto via `localhost`. Os cookies de sessão são `Secure` em produção, então o login por HTTP em IP de rede tende a falhar.
- **Segurança**: os usuários de teste têm senha pública e são recriados a cada subida, portanto o ambiente é para uso local e não deve ser exposto.
