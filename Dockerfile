# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY libs/parser/package.json ./libs/parser/
COPY libs/shared/package.json ./libs/shared/
COPY libs/utils/package.json ./libs/utils/
COPY libs/ui/package.json ./libs/ui/

# Install all workspace deps (frozen for reproducibility)
RUN pnpm install --frozen-lockfile --filter api... 

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/libs/database/node_modules ./libs/database/node_modules
COPY --from=deps /app/libs/parser/node_modules ./libs/parser/node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules
COPY --from=deps /app/libs/utils/node_modules ./libs/utils/node_modules

# Copy source (all workspace packages that api depends on, plus api itself)
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY libs/database ./libs/database
COPY libs/parser ./libs/parser
COPY libs/shared ./libs/shared
COPY libs/utils ./libs/utils

# Cloud Run injects PORT; default to 3001 locally
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# Use tsx so workspace *.ts imports resolve without a compile step
CMD ["node_modules/.bin/tsx", "apps/api/src/server.ts"]
