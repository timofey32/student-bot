import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupAdmin } from '../middleware/auth.js'

const updateSettingsSchema = z.object({
  lateThreshold: z.number().int().min(0).max(120).optional(),
  autoMarkAbsent: z.boolean().optional(),
  notifyParents: z.boolean().optional(),
  notifyStudents: z.boolean().optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  timezone: z.string().optional(),
})

export async function settingsRoutes(app: FastifyInstance) {
  // Get group settings
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId } = request.query as { groupId?: string }
    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'groupId required' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Not a member of this group' })
    }

    let settings = await prisma.settings.findUnique({ where: { groupId } })
    if (!settings) {
      settings = await prisma.settings.create({ data: { groupId } })
    }

    return reply.send({ success: true, data: settings })
  })

  // Update settings (admin)
  app.patch('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = updateSettingsSchema.parse(request.body)

    const settings = await prisma.settings.upsert({
      where: { groupId: membership.groupId },
      create: { groupId: membership.groupId, ...data },
      update: data,
    })

    return reply.send({ success: true, data: settings })
  })
}