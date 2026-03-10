FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:8080/health/ping || exit 1

CMD ["node", "src/server.js"]
