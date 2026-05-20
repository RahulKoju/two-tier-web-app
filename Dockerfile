# Stage 1: Build
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
RUN pnpm install --frozen-lockfile

COPY . .
RUN npx prisma generate

RUN pnpm build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Standalone server + its own trimmed node_modules
COPY --from=builder /app/.next/standalone ./

# Static assets (not included in standalone)
COPY --from=builder /app/.next/static ./.next/static

# Public folder
# COPY --from=builder /app/public ./public

# Prisma engine binary (standalone excludes these)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma schema (needed by migrate service)
COPY --from=builder /app/prisma ./prisma

COPY scripts/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["sh", "start.sh"]