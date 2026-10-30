import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const createMaterialSchema = z.object({
  groupId: z.string(),
  subjectId: z.string().optional(),
  title: z.string().min(1).max(200),
  type: z.enum(['LECTURE_NOTES', 'METHODOLOGY', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']).default('OTHER'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  externalUrl: z.string().url().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
})

const updateMaterialSchema = createMaterialSchema.partial().omit({ groupId: true })

export async function materialRoutes(app: FastifyInstance) {
  // Get materials for group
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, subjectId, type } = request.query as {
      groupId?: string
      subjectId?: string
      type?: string
    }

    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'groupId required' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Not a member of this group' })
    }

    const where: any = { groupId, isPublic: true }
    if (subjectId) where.subjectId = subjectId
    if (type) where.type = type

    // Admins see all materials
    if (['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      delete where.isPublic
    }

    const materials = await prisma.material.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })

    return reply.send({ success: true, data: materials })
  })

  // Get single material
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
      },
    })

    if (!material) {
      return reply.status(404).send({ success: false, error: 'Material not found' })
    }

    // Check access
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: material.groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }
    if (!material.isPublic && !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    return reply.send({ success: true, data: material })
  })

  // Create material (admin)
  app.post('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = createMaterialSchema.parse({ ...(request.body as object), groupId: membership.groupId, uploadedBy: request.auth!.userId })

    const maxOrder = await prisma.material.findFirst({
      where: { groupId: membership.groupId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const material = await prisma.material.create({
      data: { ...data, order: (maxOrder?.order ?? -1) + 1 },
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.status(201).send({ success: true, data: material })
  })

  // Update material (admin)
  app.patch('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateMaterialSchema.parse(request.body)

    const material = await prisma.material.update({
      where: { id },
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.send({ success: true, data: material })
  })

  // Delete material (admin)
  app.delete('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.material.delete({ where: { id } })
    return reply.send({ success: true, data: { deleted: true } })
  })
}