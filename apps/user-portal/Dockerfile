# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY apps/user-portal/package.json apps/user-portal/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @interview-agent/user-portal...
COPY tsconfig.base.json .eslintrc.cjs eslint.config.mjs eslint.next.config.mjs ./
COPY packages/contracts packages/contracts
COPY packages/auth-client packages/auth-client
COPY apps/user-portal apps/user-portal

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_APP_NAME="Interview Agent"
ARG NEXT_PUBLIC_AUTH_MODE=development
ARG NEXT_PUBLIC_USER_AUTH_MODE=local
ARG NEXT_PUBLIC_OIDC_AUTHORITY=https://identity.example.com/
ARG NEXT_PUBLIC_OIDC_CLIENT_ID=interview-agent-web
ARG NEXT_PUBLIC_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
ARG NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
ARG NEXT_PUBLIC_OIDC_SCOPE="openid profile email"
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE}
ENV NEXT_PUBLIC_USER_AUTH_MODE=${NEXT_PUBLIC_USER_AUTH_MODE}
ENV NEXT_PUBLIC_OIDC_AUTHORITY=${NEXT_PUBLIC_OIDC_AUTHORITY}
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=${NEXT_PUBLIC_OIDC_CLIENT_ID}
ENV NEXT_PUBLIC_OIDC_REDIRECT_URI=${NEXT_PUBLIC_OIDC_REDIRECT_URI}
ENV NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI=${NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI}
ENV NEXT_PUBLIC_OIDC_SCOPE=${NEXT_PUBLIC_OIDC_SCOPE}
RUN pnpm --filter @interview-agent/user-portal build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/user-portal/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/user-portal/.next/static ./apps/user-portal/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/user-portal/server.js"]
