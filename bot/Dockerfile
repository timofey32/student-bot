FROM node:20-bullseye-slim

ARG CACHE_BUST=1

WORKDIR /app

COPY package*.json ./
COPY bot/package*.json ./bot/
COPY shared/package*.json ./shared/

RUN npm ci --workspaces --include-workspace-root

COPY bot/tsconfig.json ./bot/
COPY bot/src ./bot/src/
COPY shared/src ./shared/src/

RUN npm run build --workspace=@student-bot/bot

CMD ["sh", "-c", "cd bot && node dist/index.js"]