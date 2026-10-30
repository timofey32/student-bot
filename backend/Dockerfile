FROM node:20-bullseye-slim

ARG CACHE_BUST=1

  WORKDIR /app

  COPY package*.json ./
  COPY backend/package*.json ./backend/
  COPY shared/package*.json ./shared/

  RUN npm ci --workspaces --include-workspace-root

  COPY backend/tsconfig.json ./backend/
  COPY backend/src ./backend/src/
  COPY shared/src ./shared/src/

  RUN npm run build --workspace=@student-bot/backend

  COPY backend/prisma ./backend/prisma/
  RUN cd backend && npx prisma generate

  COPY . .

  CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/index.js"]