FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/user-service/package.json ./services/user-service/

RUN npm install --workspace=services/user-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/user-service ./services/user-service

EXPOSE 3003

CMD ["node", "services/user-service/src/server.js"]
