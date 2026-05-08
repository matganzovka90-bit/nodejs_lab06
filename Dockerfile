FROM node:24-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:24-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]