# 📋 Пошаговое руководство по настройке

## 1. Подготовка окружения

### Установите необходимые инструменты:
- **Node.js 20+** (рекомендую через [fnm](https://github.com/Schniz/fnm) или [nvm](https://github.com/nvm-sh/nvm))
- **Git**
- **Docker Desktop** (опционально, для продакшн-сборки)

```bash
# Проверка версий
node --version  # должно быть v20+
npm --version
git --version
```

## 2. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Введите имя бота (например: "Student Bot")
4. Введите username (например: `my_student_bot` — должен заканчиваться на `bot`)
5. Сохраните **токен** (формат: `123456789:ABCdefGhIjKlMnOpQrStUvWxYz`)

### Настройка Mini App:
1. В @BotFather: `/newapp` → выберите вашего бота
2. Название: "Student Bot"
3. Описание: "Управление учебной группой"
4. Загрузите иконку (512x512)
5. **Web App URL**: `https://your-app.vercel.app` (после деплоя фронтенда)
6. `/setmenubutton` → выберите бота → текст: "Открыть приложение" → URL: `https://your-app.vercel.app`

## 3. Настройка проекта

```bash
# Клонирование (если еще не сделано)
cd student-bot

# Быстрая настройка (Windows PowerShell)
.\start-dev.ps1

# Или вручную:
npm install
cd backend && npx prisma generate && npx prisma db push && cd ..
```

### Настройка переменных окружения:

**backend/.env:**
```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars-long"
BOT_TOKEN="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
BOT_USERNAME="your_bot_username"
MINI_APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

**bot/.env:**
```env
NODE_ENV=development
BOT_TOKEN="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
BOT_USERNAME="your_bot_username"
MINI_APP_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
```

> 💡 **Генерация JWT_SECRET:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Запуск в разработке

```bash
# Один командой запускает всё:
npm run dev
```

Это запустит:
- 🔧 **Backend API** → `http://localhost:4000`
- 🌐 **Frontend (Vite)** → `http://localhost:3000`
- 🤖 **Bot** → polling mode

### Проверка:
1. Откройте `http://localhost:3000` — должно открыться Mini App
2. В боте отправьте `/start` → нажмите "Открыть Mini App"
3. Зарегистрируйтесь (введите ФИО)
4. Создайте группу (если вы админ) или присоединитесь по ссылке

## 5. Структура API (для понимания)

```
POST   /api/v1/auth/telegram     # Вход через Telegram Web App
POST   /api/v1/auth/register     # Регистрация по приглашению
GET    /api/v1/auth/me           # Текущий пользователь

GET    /api/v1/groups            # Мои группы
POST   /api/v1/groups            # Создать группу (super admin)
GET    /api/v1/groups/:id        # Детали группы
PATCH  /api/v1/groups/:id        # Обновить группу
POST   /api/v1/groups/:id/invite-token  # Новая пригласительная ссылка

GET    /api/v1/pairs?groupId=    # Пары группы
GET    /api/v1/pairs/today       # Пары на сегодня (главный экран)
POST   /api/v1/pairs             # Создать пару (admin)
PATCH  /api/v1/pairs/:id         # Обновить пару

POST   /api/v1/attendance/mark   # Отметить себя
POST   /api/v1/attendance/bulk   # Массовая отметка (admin)

GET    /api/v1/subjects          # Предметы группы
POST   /api/v1/subjects          # Создать предмет (admin)

GET    /api/v1/materials         # Материалы
POST   /api/v1/materials         # Добавить материал (admin)

GET    /api/v1/homeworks         # Домашние задания
POST   /api/v1/homeworks         # Создать (admin)
POST   /api/v1/homeworks/submit  # Сдать (student)
POST   /api/v1/homeworks/grade   # Оценить (admin)

GET    /api/v1/grades            # Оценки
GET    /api/v1/grades/summary    # Сводка по предметам
POST   /api/v1/grades            # Добавить оценку (admin)
POST   /api/v1/grades/bulk       # Массовые оценки (admin)

GET    /api/v1/reports/attendance/pdf  # PDF отчёт посещаемости
GET    /api/v1/reports/grades/excel    # Excel ведомость
POST   /api/v1/reports/report-cards    # Загрузить рапортичку
```

## 6. Деплой в продакшн (бесплатно)

### Вариант А: Railway + Vercel (рекомендую)

**Railway (Backend + Bot + PostgreSQL):**
1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → выберите репозиторий
3. Добавьте сервис **PostgreSQL** (Add → Database → PostgreSQL)
4. Добавьте **Web Service** для backend:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. Добавьте **Web Service** для bot:
   - Root Directory: `bot`
   - Build Command: `npm run build`
   - Start Command: `npm start`
6. В Variables добавьте все переменные из `.env.example`

**Vercel (Frontend):**
1. Зарегистрируйтесь на [vercel.com](https://vercel.com)
2. Import Project → GitHub → выберите репозиторий
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL` = `https://your-backend.railway.app/api/v1`
   - `VITE_WS_URL` = `wss://your-backend.railway.app/ws`
   - `VITE_BOT_USERNAME` = `your_bot_username`

### Вариант Б: Render
- Backend: Web Service (Docker)
- Bot: Web Service (Docker)
- Database: PostgreSQL (free 90 days)
- Frontend: Static Site

### Вариант В: VPS (Oracle Always Free / Hetzner)
```bash
# На сервере
git clone <repo>
cd student-bot
cp backend/.env.example backend/.env
# Настройте .env
docker-compose up -d

# Настройте nginx для проксирования frontend + backend
```

## 7. Полезные команды

```bash
# Разработка
npm run dev              # Запуск всего (backend + frontend + bot)
npm run dev:backend      # Только бэкенд
npm run dev:frontend     # Только фронтенд
npm run dev:bot          # Только бот

# База данных
npm run db:generate      # Prisma generate
npm run db:push          # Push schema (dev)
npm run db:migrate       # Миграции (prod)
npm run db:studio        # Prisma Studio (GUI)

# Линтинг и форматирование
npm run lint
npm run format

# Docker
docker-compose up -d     # Запуск в Docker
docker-compose logs -f   # Логи
docker-compose down      # Остановка
```

## 8. Типичные проблемы

| Проблема | Решение |
|----------|---------|
| `BOT_TOKEN` не работает | Проверьте токен в @BotFather, нет ли пробелов |
| Mini App не открывается | Проверьте `MINI_APP_URL` в .env и Web App URL в BotFather |
| CORS ошибки | Проверьте `FRONTEND_URL` в backend/.env |
| БД не подключается | Для локальной разработки используется SQLite файл `backend/dev.db` |
| Prisma ошибки | `npx prisma generate` → `npx prisma db push` |
| Порт занят | Измените `PORT` в .env или остановите другой процесс |

## 9. Полезные ссылки

- [Fastify Docs](https://fastify.dev/docs/latest/)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Telegraf](https://telegraf.js.org/)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)

---

**Готово!** 🎉 Ваш Student Bot готов к работе. Начните с создания группы и приглашения студентов.