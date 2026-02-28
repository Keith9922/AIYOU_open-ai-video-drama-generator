# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./

RUN corepack enable && \
    corepack prepare pnpm@8 --activate

RUN pnpm install --no-strict-peer-dependencies

COPY . .

RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4000

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4000"]
