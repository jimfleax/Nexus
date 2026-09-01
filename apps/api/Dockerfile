# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps
#   Install ALL workspace deps once so they are cached as a separate layer.
#   Uses the monorepo root context (docker build -f apps/api/Dockerfile .)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install prod + dev deps (we need devDeps to compile TS)
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – builder
#   Compile TypeScript → dist/
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build the shared package first (if it has a build script), then the api
RUN npm run build --workspace=packages/shared --if-present
RUN npm run build --workspace=apps/api

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – runner
#   Lean production image — no devDeps, no source files.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

WORKDIR /app

# Copy manifests to install prod-only deps in runner stage
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

USER fastify

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# The compiled entry point (tsc emits src/index.js → dist/src/index.js)
CMD ["node", "apps/api/dist/src/index.js"]
