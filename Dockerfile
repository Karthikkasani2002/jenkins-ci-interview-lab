# syntax=docker/dockerfile:1

FROM node:24-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src
COPY test ./test
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN npm test

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
ARG VCS_REF=unknown
ARG VCS_URL=unknown
LABEL org.opencontainers.image.title="Jenkins CI Interview Lab Task API" \
      org.opencontainers.image.description="A small HTTP API used to demonstrate production CI practices in Jenkins" \
      org.opencontainers.image.source="$VCS_URL" \
      org.opencontainers.image.revision="$VCS_REF"
COPY --from=test --chown=node:node /app/package.json ./package.json
COPY --from=test --chown=node:node /app/src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/server.js"]
