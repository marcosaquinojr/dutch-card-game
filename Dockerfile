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
RUN npm ci --only=production

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
