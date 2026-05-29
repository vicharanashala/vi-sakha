# ==========================================
# Phase 1: Build the packages & discord bot
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations and workspaces
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY discord-bot/package*.json ./discord-bot/

# Install dependencies including workspaces
RUN npm ci --legacy-peer-deps

# Build all monorepo packages
RUN npm run build:packages --if-present

# Copy bot source
COPY discord-bot/ ./discord-bot/
WORKDIR /app/discord-bot

# Install bot dependencies
RUN npm install --legacy-peer-deps

# Compile NestJS Discord Bot (force clean build)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN rm -rf dist tsconfig.tsbuildinfo && npx nest build

# ==========================================
# Phase 2: Production runtime image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy monorepo built workspaces and node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/discord-bot/package*.json ./discord-bot/
COPY --from=builder /app/discord-bot/node_modules ./discord-bot/node_modules
COPY --from=builder /app/discord-bot/dist ./discord-bot/dist

WORKDIR /app/discord-bot

CMD ["node", "dist/main"]
