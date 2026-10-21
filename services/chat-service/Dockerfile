FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/chat-service/package.json ./services/chat-service/

RUN npm install --workspace=services/chat-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/chat-service ./services/chat-service

EXPOSE 3005

CMD ["node", "services/chat-service/src/server.js"]
