FROM node:24-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Desenvolvimento: o código vem de um bind mount e node_modules, de um volume.
# O marcador registra o lock instalado; o volume novo herda o conteúdo e o dono deste diretório.
FROM deps AS dev
# nest --watch usa ps para encerrar o processo anterior; sem ele, o novo morre com EADDRINUSE.
RUN apt-get update && apt-get install -y --no-install-recommends procps && rm -rf /var/lib/apt/lists/*
RUN cp package-lock.json node_modules/.dev-package-lock && chown -R node:node /app
USER node

FROM deps AS build
COPY . .
# O prisma generate não acessa o banco; a URL fictícia existe só neste comando.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    npx prisma generate --config prisma7.config.ts
RUN npm run build

# Aplica migrations e executa o seed; usa prisma e tsx (dependências de desenvolvimento).
FROM build AS migrate
USER node
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma7.config.ts && npx prisma db seed --config prisma7.config.ts"]

FROM base AS prod-deps
COPY package.json package-lock.json ./
# --omit=optional é necessário: prisma é peer opcional de @prisma/client e continuaria instalado só com --omit=dev.
RUN npm ci --omit=dev --omit=optional

# Imagem final da API: último estágio, padrão de um build sem --target.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
