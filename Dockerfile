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

# Install all workspace deps including devDependencies (needed for tsc at build time)
RUN pnpm install --frozen-lockfile --filter api...

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

# Copy source code
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY libs/database ./libs/database
COPY libs/parser ./libs/parser
COPY libs/shared ./libs/shared
COPY libs/utils ./libs/utils

# Compile TypeScript to JS
RUN pnpm --filter api build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests (needed for pnpm prod install)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY libs/parser/package.json ./libs/parser/
COPY libs/shared/package.json ./libs/shared/
COPY libs/utils/package.json ./libs/utils/
COPY libs/ui/package.json ./libs/ui/

# Install production deps only (no devDependencies, no tsx)
RUN pnpm install --frozen-lockfile --filter api... --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy source of workspace libs (needed for require resolution at runtime)
COPY --from=builder /app/libs/database ./libs/database
COPY --from=builder /app/libs/parser ./libs/parser
COPY --from=builder /app/libs/shared ./libs/shared
COPY --from=builder /app/libs/utils ./libs/utils

# Cloud Run injects PORT; default to 3001 locally
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# Run compiled JS — no tsx required
CMD ["node", "apps/api/dist/server.js"]
