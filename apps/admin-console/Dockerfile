# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# workspace 依赖清单需与 apps/admin-console/package.json 的 workspace:* 保持一致，缺一会导致 install/build 失败
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/page-agent-client/package.json packages/page-agent-client/package.json
COPY apps/admin-console/package.json apps/admin-console/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @interview-agent/admin-console...
# next build 的 lint 步骤使用 flat config（eslint.config.mjs 及其引用的 eslint.next.config.mjs）
COPY tsconfig.base.json eslint.config.mjs eslint.next.config.mjs ./
COPY packages/contracts packages/contracts
COPY packages/auth-client packages/auth-client
COPY packages/api-client packages/api-client
COPY packages/page-agent-client packages/page-agent-client
COPY apps/admin-console apps/admin-console

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:7101/api
ARG NEXT_PUBLIC_APP_NAME="Interview Agent"
ARG NEXT_PUBLIC_ADMIN_AUTH_MODE=local
ARG NEXT_PUBLIC_OIDC_AUTHORITY=https://identity.example.com/
ARG NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID=interview-agent-admin
ARG NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI=http://localhost:7102/auth/callback
ARG NEXT_PUBLIC_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:7102
ARG NEXT_PUBLIC_OIDC_SCOPE="openid profile email"
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_ADMIN_AUTH_MODE=${NEXT_PUBLIC_ADMIN_AUTH_MODE}
ENV NEXT_PUBLIC_OIDC_AUTHORITY=${NEXT_PUBLIC_OIDC_AUTHORITY}
ENV NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID=${NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID}
ENV NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI=${NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI}
ENV NEXT_PUBLIC_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URI=${NEXT_PUBLIC_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URI}
ENV NEXT_PUBLIC_OIDC_SCOPE=${NEXT_PUBLIC_OIDC_SCOPE}
# 容器运行时依赖 standalone 输出（runtime 阶段复制 .next/standalone）
ENV NEXT_OUTPUT_STANDALONE=true
# --filter app... 让 pnpm 按拓扑序先构建 workspace 依赖的 dist（api-client/page-agent-client 经 node_modules 解析到 dist）
RUN pnpm --filter @interview-agent/admin-console... build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3002
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/admin-console/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/admin-console/.next/static ./apps/admin-console/.next/static
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3002/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/admin-console/server.js"]
