import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9]+$/),
  description: z.string().optional(),
})

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function groupRoutes(app: FastifyInstance) {
  // Get all groups for current user
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: request.auth!.userId, isActive: true },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true, subjects: true, pairs: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return reply.send({
      success: true,
      data: memberships.map(m => ({
        ...m.group,
        memberCount: m.group._count.members,
        subjectCount: m.group._count.subjects,
        pairCount: m.group._count.pairs,
        myRole: m.role,
      })),
    })
  })

  // Create group (admin only)
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    // Only SUPER_ADMIN can create groups
    const user = await prisma.user.findUnique({ where: { id: request.auth!.userId } })
    if (user?.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ success: false, error: 'Only super admin can create groups' })
    }

    const data = createGroupSchema.parse(request.body)

    // Check code uniqueness
    const existing = await prisma.group.findUnique({ where: { code: data.code.toUpperCase() } })
    if (existing) {
      return reply.status(400).send({ success: false, error: 'Group code already exists' })
    }

    const group = await prisma.group.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
      },
    })

    // Add creator as admin
    await prisma.groupMember.create({
      data: {
        userId: request.auth!.userId,
        groupId: group.id,
        role: 'ADMIN',
      },
    })

    // Create default settings
    await prisma.settings.create({
      data: { groupId: group.id },
    })

    return reply.status(201).send({ success: true, data: group })
  })

  // Get group by ID
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: id } },
      include: { group: true },
    })

    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Group not found or access denied' })
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        subjects: { where: { isActive: true }, orderBy: { order: 'asc' } },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true, username: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { pairs: true, materials: true, homeworks: true } },
      },
    })

    return reply.send({
      success: true,
      data: { ...group!, myRole: membership.role },
    })
  })

  // Get group by invite token (public)
  app.get('/invite/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const group = await prisma.group.findUnique({
      where: { inviteToken: token },
      select: { id: true, name: true, code: true, description: true },
    })

    if (!group) {
      return reply.status(404).send({ success: false, error: 'Invalid invite link' })
    }

    return reply.send({ success: true, data: group })
  })

  // Update group
  app.patch('/:id', { preHandler: [requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateGroupSchema.parse(request.body)

    const group = await prisma.group.update({
      where: { id },
      data,
    })

    return reply.send({ success: true, data: group })
  })

  // Delete group (super admin only)
  app.delete('/:id', { preHandler: [requireAuth, requireRole(['SUPER_ADMIN'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.group.delete({ where: { id } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // Generate new invite token
  app.post('/:id/invite-token', { preHandler: [requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const group = await prisma.group.update({
      where: { id },
      data: { inviteToken: crypto.randomUUID() },
      select: { inviteToken: true },
    })

    return reply.send({ success: true, data: { inviteToken: group.inviteToken } })
  })
}