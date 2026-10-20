# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Reduce the monorepo to the api and the workspace packages it depends on.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.9 prune api --docker

# Install from package manifests only, so this layer is reused until a dependency changes.
FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=api
# --legacy: the modern deploy needs injected workspace packages, which would stop local
# dev from seeing shared rebuilds through the workspace symlink.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm --filter=api deploy --prod --legacy /prod/api

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /prod/api .
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
