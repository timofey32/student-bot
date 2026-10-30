import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const createSubjectSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  description: z.string().optional(),
})

const updateSubjectSchema = createSubjectSchema.partial().omit({ groupId: true })

export async function subjectRoutes(app: FastifyInstance) {
  // Get subjects for group
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

    const subjects = await prisma.subject.findMany({
      where: { groupId, isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { pairs: true, materials: true, homeworks: true, grades: true } },
      },
    })

    return reply.send({ success: true, data: subjects })
  })

  // Create subject (admin)
  app.post('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = createSubjectSchema.parse({ ...(request.body as object), groupId: membership.groupId })

    const maxOrder = await prisma.subject.findFirst({
      where: { groupId: membership.groupId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const subject = await prisma.subject.create({
      data: { ...(data as object), order: (maxOrder?.order ?? -1) + 1 },
    })

    return reply.status(201).send({ success: true, data: subject })
  })

  // Update subject (admin)
  app.patch('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateSubjectSchema.parse(request.body)

    const subject = await prisma.subject.update({
      where: { id },
      data,
    })

    return reply.send({ success: true, data: subject })
  })

  // Reorder subjects (admin)
  app.post('/reorder', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const { subjectIds } = z.object({ subjectIds: z.array(z.string()) }).parse(request.body)

    await Promise.all(
      subjectIds.map((id, index) =>
        prisma.subject.update({ where: { id }, data: { order: index } })
      )
    )

    return reply.send({ success: true, data: { reordered: true } })
  })

  // Delete subject (admin)
  app.delete('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.subject.update({ where: { id }, data: { isActive: false } })
    return reply.send({ success: true, data: { deleted: true } })
  })
}