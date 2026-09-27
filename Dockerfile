FROM node:22-alpine

WORKDIR /workspace/app

COPY app/package.json app/package-lock.json ./

RUN npm ci

COPY app/ ./

COPY new_data/ ../new_data/

RUN npm run build

ENV NODE_ENV=production

CMD ["node", "server.js"]