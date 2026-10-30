import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export async function notificationRoutes(app: FastifyInstance) {
  // Get user notifications
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { unreadOnly, limit, offset } = request.query as {
      unreadOnly?: string
      limit?: string
      offset?: string
    }

    const where: any = { recipientId: request.auth!.userId }
    if (unreadOnly === 'true') where.isRead = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit || '50'),
        skip: parseInt(offset || '0'),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: request.auth!.userId, isRead: false } }),
    ])

    return reply.send({
      success: true,
      data: { notifications, total, unreadCount },
    })
  })

  // Mark as read
  app.patch('/:id/read', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.recipientId !== request.auth!.userId) {
      return reply.status(404).send({ success: false, error: 'Notification not found' })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })

    return reply.send({ success: true, data: updated })
  })

  // Mark all as read
  app.patch('/read-all', { preHandler: requireAuth }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { recipientId: request.auth!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return reply.send({ success: true, data: { markedAll: true } })
  })

  // Delete notification
  app.delete('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.recipientId !== request.auth!.userId) {
      return reply.status(404).send({ success: false, error: 'Notification not found' })
    }

    await prisma.notification.delete({ where: { id } })
    return reply.send({ success: true, data: { deleted: true } })
  })
}