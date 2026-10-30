# 🚀 Deployment Guide: Vercel (Frontend) + Railway (Backend + Bot + PostgreSQL)

## ✅ What's Ready
- **Frontend builds successfully** ✅
- **Shared package builds successfully** ✅
- **Backend & Bot run with tsx (no build step needed)** ✅
- **Docker files created for Railway** ✅

---

## 📦 Step 1: Deploy Frontend to Vercel

### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your `student-bot` repository
4. **Framework Preset**: Vite (auto-detected)
5. **Root Directory**: `frontend`
6. **Build Command**: `npm run build` (auto-detected)
7. **Output Directory**: `dist` (auto-detected)
8. Add Environment Variables:
   - `VITE_API_URL` = `https://your-backend.railway.app/api/v1`
   - `VITE_WS_URL` = `wss://your-backend.railway.app/ws`
   - `VITE_BOT_USERNAME` = `your_bot_username` (without @)
9. Click **Deploy**

### Option B: Via Vercel CLI
```bash
cd frontend
npx vercel --prod
```

---

## 🚂 Step 2: Deploy Backend + Bot + PostgreSQL to Railway

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `student-bot` repository

### 2. Add PostgreSQL Database
1. In your Railway project, click "New" → "Database" → "PostgreSQL"
2. Wait for it to provision
3. Copy the `DATABASE_URL` from the PostgreSQL service variables

### 3. Add Backend Service
1. Click "New" → "GitHub Repo" → Select your repo
2. **Service Name**: `backend`
3. **Root Directory**: `backend`
4. **Dockerfile Path**: `backend/Dockerfile` (auto-detected)
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   DATABASE_URL=<from PostgreSQL service>
   JWT_SECRET=<generate with: openssl rand -base64 32>
   JWT_EXPIRES_IN=7d
   BOT_TOKEN=<from BotFather>
   BOT_USERNAME=<your_bot_username>
   MINI_APP_URL=<your Vercel frontend URL>
   FRONTEND_URL=<your Vercel frontend URL>
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=/app/uploads
   ```

### 4. Add Bot Service
1. Click "New" → "GitHub Repo" → Select your repo
2. **Service Name**: `bot`
3. **Root Directory**: `bot`
4. **Dockerfile Path**: `bot/Dockerfile`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   BOT_TOKEN=<from BotFather>
   BOT_USERNAME=<your_bot_username>
   MINI_APP_URL=<your Vercel frontend URL>
   DATABASE_URL=<from PostgreSQL service>
   ```

### 5. Run Database Migrations
In Railway, go to your **backend** service → **Variables** tab → add a temporary variable:
```
RUN_MIGRATIONS=true
```
Then redeploy. The backend will run `prisma migrate deploy` on startup.

Or run manually via Railway CLI:
```bash
railway run --service backend npx prisma migrate deploy
```

---

## 🤖 Step 3: Configure BotFather

1. Open @BotFather in Telegram
2. `/mybots` → Select your bot
3. **Bot Settings** → **Menu Button** → Set URL to your Vercel frontend URL
4. **Bot Settings** → **Web App** → Set Web App URL to your Vercel frontend URL
5. **Bot Settings** → **Domain** → Add your Vercel domain (e.g., `your-app.vercel.app`)

---

## 🔧 Step 4: Update Environment Variables

After deployment, update these with actual URLs:

### Frontend (Vercel)
- `VITE_API_URL` = `https://backend-xxxx.railway.app/api/v1`
- `VITE_WS_URL` = `wss://backend-xxxx.railway.app/ws`
- `VITE_BOT_USERNAME` = `your_bot_username`

### Backend (Railway)
- `MINI_APP_URL` = `https://your-app.vercel.app`
- `FRONTEND_URL` = `https://your-app.vercel.app`
- `BOT_TOKEN` = from BotFather
- `BOT_USERNAME` = your_bot_username

### Bot (Railway)
- `MINI_APP_URL` = `https://your-app.vercel.app`
- `BOT_TOKEN` = from BotFather
- `BOT_USERNAME` = your_bot_username

---

## 🔐 Generate Secrets

```bash
# JWT Secret (run locally)
openssl rand -base64 32

# Database password (Railway generates automatically)
```

---

## 📋 Quick Checklist

- [ ] Frontend deployed to Vercel
- [ ] PostgreSQL created on Railway
- [ ] Backend deployed to Railway (with DATABASE_URL)
- [ ] Bot deployed to Railway (with DATABASE_URL)
- [ ] Prisma migrations run
- [ ] BotFather configured with Vercel URL
- [ ] Environment variables updated with actual URLs
- [ ] Test: Open Mini App from Telegram bot
- [ ] Test: Create group, invite members
- [ ] Test: Attendance, homework, grades

---

## 🐛 Troubleshooting

### Frontend shows "No tunnel" or blank
- Check `VITE_API_URL` and `VITE_WS_URL` point to Railway backend
- Check CORS: Backend `FRONTEND_URL` must match Vercel URL exactly
- Check browser console for errors

### Backend fails to start
- Check Railway logs for Prisma errors
- Ensure `DATABASE_URL` is correct
- Run migrations: `railway run --service backend npx prisma migrate deploy`

### Bot doesn't respond
- Check Railway bot service logs
- Verify `BOT_TOKEN` is correct
- Check webhook URL if using webhooks

### Database connection issues
- Railway PostgreSQL uses internal networking
- Use `DATABASE_URL` from PostgreSQL service variables
- Ensure backend and bot services are in same Railway project

---

## 💰 Cost (Free Tier)

| Service | Free Tier Limits |
|---------|-----------------|
| Vercel | 100GB bandwidth, unlimited personal projects |
| Railway | $5 credit/month (enough for small PostgreSQL + 2 services) |

**Total: $0/month** for development/small usage!

---

## 🔄 Updates

To update:
1. Push to GitHub
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend & bot (if connected to GitHub)
4. Run migrations if schema changed: `railway run --service backend npx prisma migrate deploy`