FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prod-server.ts ./prod-server.ts
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["npx", "tsx", "prod-server.ts"]
