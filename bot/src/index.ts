import 'dotenv/config'
import { Telegraf, Markup, Scenes, session } from 'telegraf'
import { PrismaClient } from '@prisma/client'
import { config } from '../utils/config.js'

const prisma = new PrismaClient()

const bot = new Telegraf(process.env.BOT_TOKEN!)

interface SessionData {
  authState?: 'waiting_name' | 'waiting_group'
  tempData?: Record<string, any>
}

bot.use(session())

// Middleware: ensure user exists in DB
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const user = await prisma.user.upsert({
      where: { telegramId: String(ctx.from.id) },
      create: {
        telegramId: String(ctx.from.id),
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
      },
      update: {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
      },
    })
    ;(ctx as any).dbUser = user
  }
  return next()
})

// Start command
bot.start(async (ctx) => {
  const args = ctx.startPayload
  const user = (ctx as any).dbUser

  if (args) {
    // Invite link: https://t.me/bot?start=invite_<token>
    const inviteToken = args.replace('invite_', '')
    const group = await prisma.group.findUnique({ where: { inviteToken } })

    if (group) {
      await prisma.groupMember.upsert({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        create: { userId: user.id, groupId: group.id, role: 'STUDENT' },
        update: { isActive: true },
      })

      return ctx.reply(
        `✅ Вы добавлены в группу «${group.name}»!\n\n` +
        `Откройте Mini App для работы:`,
        Markup.inlineKeyboard([
          Markup.button.webApp('🚀 Открыть Mini App', `${process.env.MINI_APP_URL}?group=${group.id}`)
        ])
      )
    }
  }

  // Regular start
  await ctx.reply(
    `Привет, ${user.firstName}! 👋\n\n` +
    `Это бот для управления учебной группой.\n` +
    `Здесь можно отмечаться на парах, смотреть расписание, сдавать домашку и следить за оценками.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть Mini App', process.env.MINI_APP_URL!)],
      [Markup.button.callback('📋 Мои группы', 'my_groups')],
      [Markup.button.callback('❓ Помощь', 'help')],
    ])
  )
})

// Help
bot.action('help', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText(
    `📖 <b>Помощь</b>\n\n` +
    `<b>Основные функции:</b>\n` +
    `• Отметка на парах — один тап\n` +
    `• Расписание на сегодня/неделю\n` +
    `• Домашние задания с дедлайнами\n` +
    `• Оценки и средний балл\n` +
    `• Материалы по предметам\n` +
    `• Рапортички (PDF/Excel)\n\n` +
    `<b>Для админов:</b>\n` +
    `• Управление группой и участниками\n` +
    `• Создание пар и домашних заданий\n` +
    `• Выставление оценок\n` +
    `• Генерация отчётов\n\n` +
    `Откройте Mini App для полного функционала.`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть Mini App', process.env.MINI_APP_URL!)]]) }
  )
})

// My groups
bot.action('my_groups', async (ctx) => {
  await ctx.answerCbQuery()
  const user = (ctx as any).dbUser

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, isActive: true },
    include: { group: true },
  })

  if (memberships.length === 0) {
    return ctx.editMessageText(
      'У вас пока нет групп.\nПришлите пригласительную ссылку или попросите админа добавить вас.',
      Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'back_to_main')]])
    )
  }

  const buttons = memberships.map(m => [
    Markup.button.webApp(
      `${m.group.name} (${m.role === 'ADMIN' ? '👑' : '👤'})`,
      `${process.env.MINI_APP_URL}?group=${m.group.id}`
    )
  ])

  buttons.push([Markup.button.callback('◀️ Назад', 'back_to_main')])

  await ctx.editMessageText('📋 <b>Ваши группы:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) })
})

bot.action('back_to_main', async (ctx) => {
  await ctx.answerCbQuery()
  const user = (ctx as any).dbUser
  await ctx.editMessageText(
    `Привет, ${user.firstName}! 👋\n\nВыберите действие:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть Mini App', process.env.MINI_APP_URL!)],
      [Markup.button.callback('📋 Мои группы', 'my_groups')],
      [Markup.button.callback('❓ Помощь', 'help')],
    ])
  )
})

// WebApp data handler (when user sends data from Mini App)
bot.on('web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data)

    switch (data.action) {
      case 'share_contact':
        // User shared contact from Mini App
        await ctx.reply('✅ Контакт получен! Теперь родители могут быть привязаны.')
        break
      case 'request_parent_link':
        // Student requests parent linking
        await ctx.reply('📩 Запрос на привязку родителя отправлен админу.')
        break
      default:
        console.log('Unknown web_app_data action:', data.action)
    }
  } catch (e) {
    console.error('WebApp data error:', e)
  }
})

// Admin commands (only for super admin)
bot.command('admin', async (ctx) => {
  const user = (ctx as any).dbUser
  if (user.role !== 'SUPER_ADMIN') return

  await ctx.reply(
    '👑 <b>Админ-панель бота</b>',
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([
      [Markup.button.callback('➕ Создать группу', 'admin_create_group')],
      [Markup.button.callback('📊 Статистика', 'admin_stats')],
      [Markup.button.callback('👥 Все пользователи', 'admin_users')],
    ])}
  )
})

bot.action('admin_create_group', async (ctx) => {
  await ctx.answerCbQuery()
  const user = (ctx as any).dbUser
  if (user.role !== 'SUPER_ADMIN') return

  // Simple scene for group creation
  ctx.session.authState = 'waiting_name'
  ctx.session.tempData = {}
  await ctx.reply('Введите название группы:')
})

bot.on('text', async (ctx) => {
  const state = ctx.session.authState
  if (!state) return

  if (state === 'waiting_name') {
    ctx.session.tempData.name = ctx.message.text
    ctx.session.authState = 'waiting_code'
    await ctx.reply('Введите код группы (латиницей, 2-20 символов):')
  } else if (state === 'waiting_code') {
    const code = ctx.message.text.toUpperCase()
    if (!/^[A-Z0-9]{2,20}$/.test(code)) {
      return ctx.reply('Код должен содержать только латинские буквы и цифры (2-20 символов). Попробуйте снова:')
    }

    const existing = await prisma.group.findUnique({ where: { code } })
    if (existing) {
      return ctx.reply('Такой код уже занят. Введите другой:')
    }

    const group = await prisma.group.create({
      data: {
        name: ctx.session.tempData.name,
        code,
        inviteToken: crypto.randomUUID(),
      },
    })

    await prisma.groupMember.create({
      data: { userId: (ctx as any).dbUser.id, groupId: group.id, role: 'ADMIN' },
    })

    await prisma.settings.create({ data: { groupId: group.id } })

    ctx.session.authState = undefined
    ctx.session.tempData = {}

    await ctx.reply(
      `✅ Группа «${group.name}» создана!\n\n` +
      `Код: ${group.code}\n` +
      `Пригласительная ссылка: https://t.me/${process.env.BOT_USERNAME}?start=invite_${group.inviteToken}`,
      Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть в Mini App', `${process.env.MINI_APP_URL}?group=${group.id}`)]])
    )
  }
})

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(console.error)
})

// Launch
async function start() {
  try {
    // Set webhook or start polling
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`)
      console.log('🤖 Bot webhook set')
    } else {
      await bot.launch()
      console.log('🤖 Bot started (polling)')
    }
  } catch (err) {
    console.error('Failed to start bot:', err)
    process.exit(1)
  }
}

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

start()