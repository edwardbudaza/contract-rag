# Build context is the repository ROOT (see docker-compose.yml: `context: .`), because the
# API depends on internal workspace packages (@contract-rag/config, shared, database) that
# live outside apps/api — a context scoped to apps/api alone couldn't see them.

FROM node:20-alpine AS base
WORKDIR /app

# Copy every workspace manifest before any source, so `npm ci` is cached across builds that
# only change application code (the common case) and only re-runs when a dependency changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/rag/package.json packages/rag/package.json
RUN npm ci

FROM base AS build
COPY tsconfig.json tsconfig.jest.json ./
COPY apps apps
COPY packages packages
COPY tests tests
# Builds every project in dependency order via TypeScript project references
# (see docs/decisions/ — the same graph apps/api/tsconfig.json's `references` field encodes).
RUN npx tsc --build --force

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
