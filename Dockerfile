# Multi-stage build for smaller final image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install required system packages for backup tools
RUN apk add --no-cache \
    mysql-client \
    curl \
    bash \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backup -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=backup:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p data logs temp && \
    chown -R backup:nodejs data logs temp && \
    chmod 755 data logs temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER backup

# Start the application
CMD ["node", "server.js"]
