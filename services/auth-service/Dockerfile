FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/auth-service/package.json ./services/auth-service/

RUN npm install --workspace=services/auth-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/auth-service ./services/auth-service

EXPOSE 3002

CMD ["node", "services/auth-service/src/server.js"]
