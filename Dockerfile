# Multi-stage Dockerfile for Next.js standalone (optimized for TCB Cloud Run)
# Target image size: ~150MB
# Environment variables: Injected at runtime by TCB Cloud Run, not needed during build

# ===== Dependencies Stage =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package manifests for layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# ===== Builder Stage =====
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time arguments (will be passed from TCB Cloud Run)
ARG NEXT_PUBLIC_TCB_ENV_ID
ARG NEXT_PUBLIC_ENV
ARG NEXT_PUBLIC_USE_TCB_AUTH

# Build-time configuration - minimal env vars for build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    SKIP_ENV_VALIDATION=true \
    NEXT_PUBLIC_TCB_ENV_ID=${NEXT_PUBLIC_TCB_ENV_ID:-cloud1-7galmfiu70af91a6} \
    NEXT_PUBLIC_ENV=${NEXT_PUBLIC_ENV:-production} \
    NEXT_PUBLIC_USE_TCB_AUTH=${NEXT_PUBLIC_USE_TCB_AUTH:-true}

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json again for install of dev dependencies needed for build
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build Next.js standalone bundle
RUN npm run build

# ===== Runtime Stage =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Runtime environment variables (will be injected by TCB Cloud Run)
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy only necessary runtime files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next.js standalone already contains the required node_modules in .next/standalone
# Do NOT copy full node_modules to significantly reduce image size

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
