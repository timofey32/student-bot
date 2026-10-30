# Bot Dockerfile for Railway (uses tsx - no build step needed)
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY bot/package*.json ./bot/
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

RUN npm ci --workspaces --include-workspace-root

# Copy Prisma schema and generate client
COPY backend/prisma ./backend/prisma/
RUN cd backend && npx prisma generate

# Copy source code
COPY . .

# Expose port (if needed for webhook)
EXPOSE 3001

# Start with tsx (no build needed)
ENV NODE_ENV=production
ENV PORT=3001

CMD ["npx", "tsx", "bot/src/index.ts"]