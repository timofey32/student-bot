import dotenv from 'dotenv'
dotenv.config()

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  BOT_USERNAME: process.env.BOT_USERNAME || '',

  // Mini App
  MINI_APP_URL: process.env.MINI_APP_URL || 'http://localhost:3000',

  // File upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',

  // Frontend URL (for CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
} as const

export type Config = typeof config