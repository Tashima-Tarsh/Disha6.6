FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Build tooling (Tailwind/PostCSS/TypeScript/Next plugins) lives in devDependencies,
# so the builder needs the complete lockfile install.
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
ARG GIT_SHA=unknown
WORKDIR /app
ENV DISHA_RELEASE_SHA=$GIT_SHA
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nextjs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data/workspaces \
  && chown nextjs:nextjs /data/workspaces

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/database ./database
COPY --from=builder --chown=nextjs:nextjs /app/scripts ./scripts

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
