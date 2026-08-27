# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY libs/parser/package.json ./libs/parser/
COPY libs/shared/package.json ./libs/shared/
COPY libs/utils/package.json ./libs/utils/
COPY libs/ui/package.json ./libs/ui/

RUN pnpm install --frozen-lockfile --filter worker...

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY tsconfig.base.json ./
COPY apps/worker ./apps/worker
COPY apps/api ./apps/api
COPY libs/database ./libs/database
COPY libs/parser ./libs/parser
COPY libs/shared ./libs/shared
COPY libs/utils ./libs/utils

# Build libs in dependency order
RUN pnpm --filter @manhwa-tracker/shared build
RUN pnpm --filter @manhwa-tracker/utils build
RUN pnpm --filter @manhwa-tracker/database build
RUN pnpm --filter @manhwa-tracker/parser build
# Build worker (also compiles api sources it imports)
RUN pnpm --filter worker build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY libs/parser/package.json ./libs/parser/
COPY libs/shared/package.json ./libs/shared/
COPY libs/utils/package.json ./libs/utils/
COPY libs/ui/package.json ./libs/ui/

RUN pnpm install --frozen-lockfile --filter worker... --prod

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/libs/database/dist ./libs/database/dist
COPY --from=builder /app/libs/parser/dist ./libs/parser/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist
COPY --from=builder /app/libs/utils/dist ./libs/utils/dist

ENV PORT=3002
ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "apps/worker/dist/server.js"]
