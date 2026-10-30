# Backend Dockerfile for Railway (uses tsx - no build step needed)
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

RUN npm ci --workspaces --include-workspace-root

# Copy Prisma schema and generate client
COPY backend/prisma ./backend/prisma/
RUN cd backend && npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start with tsx (no build needed)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["npx", "tsx", "backend/src/index.ts"]