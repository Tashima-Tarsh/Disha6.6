# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
ARG NEXT_BUILD_DIR=.next
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nextjs \
  && adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nextjs public ./public
COPY --from=builder --chown=nextjs:nextjs /app/${NEXT_BUILD_DIR}/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/${NEXT_BUILD_DIR}/static ./${NEXT_BUILD_DIR}/static
COPY --chown=nextjs:nextjs database ./database
COPY --chown=nextjs:nextjs data ./data
COPY --chown=nextjs:nextjs scripts ./scripts

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
