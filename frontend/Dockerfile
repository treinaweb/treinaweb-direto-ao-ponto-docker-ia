FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Desenvolvimento: o código vem de um bind mount e node_modules, de um volume.
# O marcador registra o lock instalado; o volume novo herda o conteúdo e o dono deste diretório.
FROM deps AS dev
RUN cp package-lock.json node_modules/.dev-package-lock && chown -R node:node /app
USER node

# API_BASE_URL é lida em runtime: o build não recebe o endereço da API.
FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
# O Docker define HOSTNAME com o id do container; sem isto, o servidor escutaria só nesse endereço.
ENV HOSTNAME=0.0.0.0
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
