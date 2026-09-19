# Same shape as apps/api/Dockerfile — see that file's comments for the reasoning. Build
# context is the repository root for the same reason (internal workspace dependencies).

FROM node:20-alpine AS base
WORKDIR /app

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
RUN npx tsc --build --force

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker ./apps/worker

CMD ["node", "apps/worker/dist/index.js"]
