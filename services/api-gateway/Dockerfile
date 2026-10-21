FROM node:20-alpine AS runner

WORKDIR /app

# Copy root workspace manifests
COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies across workspace
RUN npm install --workspace=services/api-gateway --workspace=packages/common --omit=dev

# Copy source files
COPY packages/common ./packages/common
COPY services/api-gateway ./services/api-gateway

EXPOSE 3000

CMD ["node", "services/api-gateway/src/server.js"]
