# Multi-stage Dockerfile for Next.js standalone (optimized for Windows Docker Desktop)
# Target image size: <150MB
# Build args: HUNYUAN_API_KEY, CLOUDBASE_ENV_ID

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

# Build-time environment variables
ARG HUNYUAN_API_KEY
ARG CLOUDBASE_ENV_ID
ARG TCB_ENV_ID
ARG CLOUDBASE_SECRET_ID
ARG CLOUDBASE_SECRET_KEY
ENV NEXT_TELEMETRY_DISABLED=1

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

# Runtime environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Runtime build args as environment variables for TCB database connection
ARG HUNYUAN_API_KEY
ARG CLOUDBASE_ENV_ID
ARG TCB_ENV_ID
ARG CLOUDBASE_SECRET_ID
ARG CLOUDBASE_SECRET_KEY
ARG TENCENTCLOUD_SECRET_ID
ARG TENCENTCLOUD_SECRET_KEY

ENV HUNYUAN_API_KEY=${HUNYUAN_API_KEY} \
    CLOUDBASE_ENV_ID=${CLOUDBASE_ENV_ID} \
    TCB_ENV_ID=${TCB_ENV_ID} \
    CLOUDBASE_SECRET_ID=${CLOUDBASE_SECRET_ID} \
    CLOUDBASE_SECRET_KEY=${CLOUDBASE_SECRET_KEY} \
    TENCENTCLOUD_SECRET_ID=${TENCENTCLOUD_SECRET_ID} \
    TENCENTCLOUD_SECRET_KEY=${TENCENTCLOUD_SECRET_KEY}

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy only necessary runtime files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy production node_modules from deps stage so runtime can require external modules
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
