# ==========================================
# Phase 1: Build the packages & backend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations and workspaces
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY backend/package*.json ./backend/

# Install dependencies including workspaces
RUN npm ci --legacy-peer-deps

# Build all monorepo packages
RUN npm run build:packages --if-present

# Copy backend source
COPY backend/ ./backend/
WORKDIR /app/backend

# Install backend dependencies
RUN npm install --legacy-peer-deps

# Compile NestJS application (force clean, non-incremental build)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN rm -rf dist tsconfig.tsbuildinfo tsconfig.build.tsbuildinfo && \
    echo "=== RESOLVED TSCONFIG ===" && \
    npx tsc -p tsconfig.build.json --showConfig && \
    echo "=== BUILDING ===" && \
    npx tsc -p tsconfig.build.json && \
    echo "=== FILES IN DIST ===" && \
    find dist -type f | head -30

# ==========================================
# Phase 2: Production runtime image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy monorepo built workspaces and node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3000

COPY backend/.env ./
COPY backend/service-account.json ./

CMD ["node", "dist/main"]
