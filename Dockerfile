FROM node:22-alpine

WORKDIR /app

COPY app/package.json app/package-lock.json ./

RUN npm ci

COPY app/ .

RUN npm run build

ENV NODE_ENV=production

CMD ["node", "server.js"]