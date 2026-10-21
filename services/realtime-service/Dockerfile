FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/realtime-service/package.json ./services/realtime-service/

RUN npm install --workspace=services/realtime-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/realtime-service ./services/realtime-service

EXPOSE 3001

CMD ["node", "services/realtime-service/src/server.js"]
