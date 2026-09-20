# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

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
FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

# Non-root user — reduces blast radius if the process is compromised
RUN addgroup --system --gid 1001 appgroup \
 && adduser  --system --uid 1001 --ingroup appgroup appuser

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

# Hand ownership of the app tree to the non-root user
RUN chown -R appuser:appgroup /app
USER appuser

ENV PORT=3002
ENV NODE_ENV=production

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "apps/worker/dist/server.js"]
