import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import bcrypt from 'bcryptjs'

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
})

const registerSchema = z.object({
  telegramId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  inviteToken: z.string().optional(),
})

// Extend FastifyInstance with config
declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: string
      JWT_SECRET: string
      JWT_EXPIRES_IN: string
      FRONTEND_URL: string
      UPLOAD_DIR: string
    }
  }
}

export async function authRoutes(app: FastifyInstance) {
  // Telegram Web App authentication
  app.post('/telegram', async (request, reply) => {
    const data = telegramAuthSchema.parse(request.body)

    // TODO: Verify Telegram Web App hash (HMAC-SHA256)
    // For now, trust the data in dev
    if (app.config.NODE_ENV === 'production') {
      // Implement proper verification
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: String(data.id) },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: String(data.id),
          username: data.username,
          firstName: data.first_name,
          lastName: data.last_name || '',
          avatarUrl: data.photo_url,
        },
      })
    }

    // If invite token provided, join group
    const body = request.body as { inviteToken?: string }
    if (body.inviteToken) {
      const group = await prisma.group.findUnique({
        where: { inviteToken: body.inviteToken },
      })

      if (group) {
        await prisma.groupMember.upsert({
          where: {
            userId_groupId: { userId: user.id, groupId: group.id },
          },
          create: { userId: user.id, groupId: group.id, role: 'STUDENT' },
          update: { isActive: true },
        })
      }
    }

    // Generate JWT
    const token = app.jwt.sign({ userId: user.id, role: user.role })

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      },
    })
  })

  // Manual registration (for invite links)
  app.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body)

    let user = await prisma.user.findUnique({
      where: { telegramId: data.telegramId },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: data.telegramId,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          avatarUrl: data.avatarUrl,
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: data.username ?? user.username,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName ?? user.middleName,
          avatarUrl: data.avatarUrl ?? user.avatarUrl,
        },
      })
    }

    if (data.inviteToken) {
      const group = await prisma.group.findUnique({
        where: { inviteToken: data.inviteToken },
      })

      if (group) {
        await prisma.groupMember.upsert({
          where: {
            userId_groupId: { userId: user.id, groupId: group.id },
          },
          create: { userId: user.id, groupId: group.id, role: 'STUDENT' },
          update: { isActive: true },
        })
      }
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role })

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      },
    })
  })

  // Get current user
  app.get('/me', async (request, reply) => {
    if (!request.auth) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { id: request.auth.userId },
      include: {
        groupMembers: {
          where: { isActive: true },
          include: { group: true },
        },
      },
    })

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        phone: user.phone,
        email: user.email,
        groups: user.groupMembers.map(gm => ({
          id: gm.group.id,
          name: gm.group.name,
          code: gm.group.code,
          role: gm.role,
        })),
      },
    })
  })

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    if (!request.auth) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' })
    }

    const token = app.jwt.sign({ userId: request.auth.userId, role: request.auth.role })
    return reply.send({ success: true, data: { token } })
  })
}