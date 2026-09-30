FROM node:24.21.0-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.12.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# Prisma 7 necesita DATABASE_URL durante prisma generate.
# No hace falta que exista la SQLite real durante el build.
ENV DATABASE_URL=file:/tmp/database.sqlite

RUN pnpm --filter @nas/api db:generate


FROM node:24.21.0-bookworm-slim AS runtime

WORKDIR /app

RUN npm install -g pnpm@10.12.1

COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_OPTIONS=--max-old-space-size=512

RUN mkdir -p /app/data \
    && chown -R node:node /app

USER node

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["pnpm", "start:prod"]