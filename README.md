# Student Bot — Telegram Mini App для управления учебной группой

Полнофункциональное приложение для отслеживания посещаемости, домашних заданий, оценок и материалов по предметам. Состоит из Telegram-бота и Mini App на React.

## ✨ Возможности

### 🎯 Основной экран (один экран — всё важное)
- Расписание пар на сегодня с цветами по предметам
- Быстрая отметка присутствия: **✓ Присутствую / ⏱ Опоздаю / ✗ Отсутствую**
- Для админов: массовая отметка всего списка за секунду
- Статистика по паре: сколько пришло, опоздало, не пришло

### 👥 Участники и роли
- **Главный админ** (ты) — полный контроль, создание групп
- **Админы** — управление группой, пары, оценки, участники
- **Студенты** — отметка себя, сдача домашки, просмотр оценок
- **Родители** — read-only доступ к пропускам и оценкам ребёнка

### 📚 Материалы по предметам
- Конспекты, методички, презентации, видео, ссылки
- Привязка к предметам, поиск, порядок сортировки
- Загрузка файлов и внешние ссылки (YouTube, Google Docs)

### 📝 Домашние задания
- Прикрепление к конкретной паре
- Дедлайны, максимальный балл, вложения
- Статусы: не сдана → сдана → проверяется → зачтено/не зачтено
- Оценка админом с комментарием

### 📊 Оценки и рапортички
- 7 типов оценок: домашка, тест, коллоквиум, экзамен, проект, участие, бонус
- Веса для расчёта взвешенного среднего
- Сводка по предметам и общий средний балл
- Генерация **PDF** (таблица посещаемости) и **Excel** (ведомость оценок)
- Загрузка фото рапортички

### 🔗 Пригласительные ссылки
- Уникальная ссылка для каждой группы: `https://t.me/bot?start=invite_<token>`
- Авто-регистрация по Telegram Web App (initData)
- Ввод ФИО → мгновенный профиль + вступление в группу

### 🔔 Уведомления
- В Telegram о новых парах, домашке, оценках
- В Mini App — центр уведомлений

## 🛠 Технологический стек

| Компонент | Технологии |
|-----------|------------|
| **Backend** | Node.js 20, Fastify, Prisma ORM, TypeScript |
| **Frontend (Mini App)** | React 18, Vite, TypeScript, Tailwind CSS v4, TanStack Query |
| **Bot** | Telegraf (TypeScript) |
| **Database** | SQLite (dev) → PostgreSQL (prod) |
| **Deploy** | Docker Compose → Railway / Render / Fly.io + Vercel |

## 📁 Структура проекта

```
student-bot/
├── backend/           # Fastify API + Prisma
│   ├── src/
│   │   ├── routes/    # REST endpoints
│   │   ├── middleware/# Auth, RBAC
│   │   ├── utils/     # Config, Prisma client
│   │   └── index.ts   # Entry point
│   └── prisma/schema.prisma
├── frontend/          # React Mini App
│   ├── src/
│   │   ├── components/# UI kit + layout
│   │   ├── pages/     # Route pages
│   │   ├── hooks/     # Auth, Group context
│   │   ├── api/       # Axios client
│   │   └── styles/    # Tailwind + design tokens
│   └── index.html
├── bot/               # Telegraf bot
│   └── src/index.ts
├── shared/            # Common types & constants
└── docker-compose.yml
```

## 🚀 Быстрый старт (локально)

### 1. Клонирование и установка
```bash
cd student-bot
npm install
```

### 2. Настройка переменных окружения
```bash
cp backend/.env.example backend/.env
# Отредактируй backend/.env:
# - BOT_TOKEN=токен_от_BotFather
# - BOT_USERNAME=username_бота
# - JWT_SECRET=длинная_случайная_строка
# - MINI_APP_URL=http://localhost:3000
# - FRONTEND_URL=http://localhost:3000
```

### 3. База данных
```bash
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### 4. Запуск всего стека одной командой
```bash
npm run dev
```
Это запустит:
- Backend API на `http://localhost:4000`
- Frontend (Vite) на `http://localhost:3000`
- Bot в polling-режиме

### 5. Открыть Mini App
В браузере: `http://localhost:3000`
Или через бота: отправь `/start` → нажми «Открыть Mini App»

## 🌐 Деплой (бесплатно)

### Вариант 1: Railway (рекомендуется для начала)
1. Залей репозиторий на GitHub
2. В Railway: **New Project** → **Deploy from GitHub**
3. Добавь сервисы: **PostgreSQL**, **Web Service** (backend), **Web Service** (bot)
4. Frontend деплои отдельно на **Vercel** (подключи GitHub репозиторий, укажи `frontend` как root directory)
5. Настрой переменные окружения в Railway и Vercel

### Вариант 2: Render
- Backend + Bot: **Web Service** (Docker)
- Database: **PostgreSQL** (бесплатно 90 дней)
- Frontend: **Static Site** (Vite build)

### Вариант 3: VPS (Oracle Always Free / Hetzner / Timeweb)
```bash
# На сервере
git clone <repo>
cd student-bot
cp backend/.env.example backend/.env
# Настрой .env
docker-compose up -d
# Настрой nginx reverse proxy для frontend + backend
```

## 📋 Переменные окружения (production)

```env
# Backend & Bot
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=очень_длинный_секретный_ключ_минимум_32_символа
BOT_TOKEN=123456:ABC-DEF...
BOT_USERNAME=my_student_bot
MINI_APP_URL=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

# Frontend (Vercel Environment Variables)
VITE_API_URL=https://your-backend.railway.app/api/v1
```

## 🎨 Дизайн-система

Тёмная тема с синим акцентом (`#3B82F6`), минимализм, удобство для мобильных.

| Токен | Значение |
|-------|----------|
| Фон | `#0B0F1A` |
| Поверхность | `#111827` / `#1F2937` |
| Акцент | `#3B82F6` |
| Успех | `#22C55E` |
| Предупреждение | `#F59E0B` |
| Ошибка | `#EF4444` |
| Радиус карточек | `12px` |
| Шрифт | `Inter` + `JetBrains Mono` |

Все токены в `frontend/tailwind.config.js` → `theme.extend.colors`.

## 📱 Telegram Mini App настройка

1. В **@BotFather**: `/newapp` → выбери бота → название → описание → фото → **Web App URL** = твой Vercel URL
2. В боте: `/setmenubutton` → выбери бота → текст кнопки «Открыть приложение» → URL = Vercel URL
3. Готово! Кнопка появится в чате с ботом.

## 🧪 Разработка

```bash
# Линтинг
npm run lint

# Форматирование
npm run format

# База данных
npm run db:studio    # Prisma Studio
npm run db:migrate   # Миграции (prod)
```

## 📝 Лицензия

MIT — используй свободно для обучения и коммерческих проектов.

---

**Нужна помощь?** Создай Issue в репозитории или пиши в Telegram.