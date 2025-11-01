# === Stage 1: Build Stage ===
# Use a full Node.js image to install dependencies, including devDependencies
# which might be needed for some build steps.
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .


# === Stage 2: Production Stage ===
# Use a lightweight Alpine image for the final production environment
FROM node:20-alpine
WORKDIR /app

# Copy only production dependencies from the builder stage
# This significantly reduces the final image size.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app.js ./app.js
# If you have other folders like 'src/routes', copy them here as well.
# COPY --from=builder /app/src ./src

# Health check endpoint for TCB Container Service
# TCB will hit this endpoint to verify if the container is healthy.
# Make sure your app.js has a corresponding '/health' route.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD [ "node", "app.js" ]
