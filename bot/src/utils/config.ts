import dotenv from 'dotenv'
dotenv.config()

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  BOT_USERNAME: process.env.BOT_USERNAME || '',
  MINI_APP_URL: process.env.MINI_APP_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
} as const