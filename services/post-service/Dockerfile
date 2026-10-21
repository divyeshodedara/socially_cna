FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/post-service/package.json ./services/post-service/

RUN npm install --workspace=services/post-service --workspace=packages/common --omit=dev

COPY packages/common ./packages/common
COPY services/post-service ./services/post-service

EXPOSE 3004

CMD ["node", "services/post-service/src/server.js"]
