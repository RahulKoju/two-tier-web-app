FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache postgresql-client
RUN pnpm install
RUN npx prisma generate

COPY . .

RUN pnpm build

COPY scripts/start.sh .

RUN chmod +x start.sh

EXPOSE 3000

CMD ["sh", "start.sh"]