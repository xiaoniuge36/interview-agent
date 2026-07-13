# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS node-base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace

FROM node-base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/product-api/package.json apps/product-api/package.json
COPY packages/contracts/package.json packages/contracts/package.json

FROM manifests AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @interview-agent/product-api...
COPY tsconfig.base.json turbo.json .eslintrc.cjs eslint.config.mjs eslint.next.config.mjs ./
COPY packages/contracts packages/contracts
COPY apps/product-api apps/product-api
RUN pnpm --filter @interview-agent/product-api build
RUN set -eux; \
    client_package="$(node -p "require.resolve('@prisma/client/package.json',{paths:['/workspace/apps/product-api']})")"; \
    client_modules="$(dirname "$(dirname "$(dirname "${client_package}")")")"; \
    cp -a "${client_modules}/.prisma/client" /opt/prisma-client

FROM manifests AS production-dependencies
ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY apps/product-api/prisma apps/product-api/prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter @interview-agent/product-api...
COPY --from=build /opt/prisma-client /opt/prisma-client
RUN set -eux; \
    client_package="$(node -p "require.resolve('@prisma/client/package.json',{paths:['/workspace/apps/product-api']})")"; \
    client_modules="$(dirname "$(dirname "$(dirname "${client_package}")")")"; \
    mkdir -p "${client_modules}/.prisma/client"; \
    cp -a /opt/prisma-client/. "${client_modules}/.prisma/client/"

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
WORKDIR /workspace
COPY --from=production-dependencies /workspace /workspace
COPY --from=build /workspace/apps/product-api/dist apps/product-api/dist
COPY --from=build /workspace/packages/contracts/dist packages/contracts/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/product-api/dist/main.js"]

FROM build AS migration
ENV NODE_ENV=production
USER node
CMD ["pnpm", "db:migrate:deploy"]
