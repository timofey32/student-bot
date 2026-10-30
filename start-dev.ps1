<#>
.SYNOPSIS
    Запуск Student Bot в режиме разработки

.DESCRIPTION
    Устанавливает зависимости, генерирует Prisma Client, запускает БД, бэкенд, бот и фронтенд
#>

param(
    [switch]$Fresh = $false
)

Write-Host "🚀 Student Bot - Dev Startup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check Node.js version
$nodeVersion = node --version
Write-Host "Node.js: $nodeVersion" -ForegroundColor Gray

# Install dependencies
if ($Fresh -or -not (Test-Path "node_modules")) {
    Write-Host "`n📦 Установка зависимостей..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "❌ Ошибка установки" -ForegroundColor Red; exit 1 }
}

# Generate Prisma Client
Write-Host "`n🔧 Генерация Prisma Client..." -ForegroundColor Yellow
cd backend
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Ошибка Prisma generate" -ForegroundColor Red; exit 1 }
cd ..

# Push database schema
Write-Host "`n🗄️ Применение схемы БД..." -ForegroundColor Yellow
cd backend
npx prisma db push
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Ошибка Prisma db push" -ForegroundColor Red; exit 1 }
cd ..

# Check .env files
$envFiles = @("backend/.env", "bot/.env")
foreach ($file in $envFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "`n⚠️ Файл $file не найден! Скопируйте .env.example" -ForegroundColor Yellow
        if (Test-Path "$file.example") {
            Copy-Item "$file.example" $file
            Write-Host "✅ Создан $file из примера - ОТРЕДАКТИРУЙТЕ ЕГО!" -ForegroundColor Green
        }
    }
}

Write-Host "`n✅ Подготовка завершена!" -ForegroundColor Green
Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Отредактируйте backend/.env и bot/.env (добавьте BOT_TOKEN, JWT_SECRET)"
Write-Host "2. Запустите: npm run dev"
Write-Host "`n🌐 Будет доступно:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000"
Write-Host "  - Backend API: http://localhost:4000"
Write-Host "  - API Docs: http://localhost:4000/docs"
Write-Host "  - Bot: polling mode"