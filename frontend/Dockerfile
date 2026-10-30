# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY shared/package.json ./shared/
RUN npm ci --workspaces --include-workspace-root

COPY . .

WORKDIR /app/frontend
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]