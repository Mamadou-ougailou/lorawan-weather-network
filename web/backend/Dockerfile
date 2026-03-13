# ─── Build stage ─────────────────────────────────────────────────────────────
# Use the official Node.js 22 Alpine image.
# Alpine is a minimal Linux distribution (~5 MB) that keeps the final image small.
FROM node:22-alpine

# Set the working directory inside the container.
# All subsequent COPY and RUN commands operate relative to this path.
WORKDIR /app

# ─── Install dependencies ─────────────────────────────────────────────────────
# Copy ONLY the package manifest first.
# Docker caches each layer: if package.json hasn't changed, the "npm install"
# layer won't be re-run on the next build — saving time and bandwidth.
COPY package.json ./

# Install production dependencies only (omit devDependencies).
RUN npm install --omit=dev

# ─── Copy application source ─────────────────────────────────────────────────
# Copied after npm install so that changes to src/ don't invalidate
# the dependency cache layer above.
COPY src/ src/

# ─── Runtime ─────────────────────────────────────────────────────────────────
# Document the port the API listens on.
EXPOSE 3000

# Configuration is provided via environment variables at container start time
# (see docker-compose.dev.yml for the full list).
# No secrets are baked into the image.

CMD ["node", "src/server.js"]
