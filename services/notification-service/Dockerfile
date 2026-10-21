FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/notification-service/package.json ./services/notification-service/

RUN npm install --workspace=services/notification-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/notification-service ./services/notification-service

EXPOSE 3006

CMD ["node", "services/notification-service/src/server.js"]
