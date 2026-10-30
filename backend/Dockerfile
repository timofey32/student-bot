FROM node:20-slim

ARG CACHE_BUST=1

  WORKDIR /app

  COPY package*.json ./
  COPY backend/package*.json ./backend/
  COPY shared/package*.json ./shared/

  RUN npm ci --workspaces --include-workspace-root

  COPY backend/prisma ./backend/prisma/
  RUN cd backend && npx prisma generate

  COPY . .

  CMD ["sh", "-c", "cd backend && node dist/index.js"]