import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin, requireSuperAdmin } from '../middleware/auth.js'

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
})

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'STUDENT']),
})

const parentLinkSchema = z.object({
  parentId: z.string(),
  studentId: z.string(),
  groupId: z.string(),
})

export async function userRoutes(app: FastifyInstance) {
  // Get group members (admin)
  app.get('/group/:groupId/members', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }

    const members = await prisma.groupMember.findMany({
      where: { groupId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            middleName: true,
            avatarUrl: true,
            phone: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: 'desc' }, { user: { lastName: 'asc' } }],
    })

    return reply.send({ success: true, data: members })
  })

  // Update own profile
  app.patch('/profile', { preHandler: requireAuth }, async (request, reply) => {
    const data = updateProfileSchema.parse(request.body)

    const user = await prisma.user.update({
      where: { id: request.auth!.userId },
      data,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        avatarUrl: true,
        role: true,
        phone: true,
        email: true,
      },
    })

    return reply.send({ success: true, data: user })
  })

  // Update member role (admin)
  app.patch('/group/:groupId/members/:userId/role', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId, userId } = request.params as { groupId: string; userId: string }
    const { role } = updateRoleSchema.parse(request.body)

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })

    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Member not found' })
    }

    // Prevent demoting super admin
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (targetUser?.role === 'SUPER_ADMIN') {
      return reply.status(403).send({ success: false, error: 'Cannot change super admin role' })
    }

    const updated = await prisma.groupMember.update({
      where: { id: membership.id },
      data: { role },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })

    return reply.send({ success: true, data: updated })
  })

  // Remove member from group (admin)
  app.delete('/group/:groupId/members/:userId', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId, userId } = request.params as { groupId: string; userId: string }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })

    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Member not found' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (targetUser?.role === 'SUPER_ADMIN') {
      return reply.status(403).send({ success: false, error: 'Cannot remove super admin' })
    }

    await prisma.groupMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    })

    return reply.send({ success: true, data: { removed: true } })
  })

  // Link parent to student (admin)
  app.post('/parent-link', { preHandler: [requireAuth, requireSuperAdmin] }, async (request, reply) => {
    const data = parentLinkSchema.parse(request.body)

    // Verify all exist
    const [parent, student, group] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.parentId } }),
      prisma.user.findUnique({ where: { id: data.studentId } }),
      prisma.group.findUnique({ where: { id: data.groupId } }),
    ])

    if (!parent || !student || !group) {
      return reply.status(404).send({ success: false, error: 'Parent, student, or group not found' })
    }

    const link = await prisma.parentStudent.upsert({
      where: {
        parentId_studentId_groupId: { parentId: data.parentId, studentId: data.studentId, groupId: data.groupId },
      },
      create: data,
      update: {},
    })

    return reply.status(201).send({ success: true, data: link })
  })

  // Get parent's children
  app.get('/parent/children', { preHandler: requireAuth }, async (request, reply) => {
    if (request.auth!.role !== 'PARENT' && request.auth!.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ success: false, error: 'Only parents can access this' })
    }

    const links = await prisma.parentStudent.findMany({
      where: { parentId: request.auth!.userId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            avatarUrl: true,
          },
        },
        group: { select: { id: true, name: true, code: true } },
      },
    })

    return reply.send({ success: true, data: links })
  })

  // Get student's parents
  app.get('/student/parents', { preHandler: requireAuth }, async (request, reply) => {
    const links = await prisma.parentStudent.findMany({
      where: { studentId: request.auth!.userId },
      include: {
        parent: {
          select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true, phone: true, email: true },
        },
        group: { select: { id: true, name: true, code: true } },
      },
    })

    return reply.send({ success: true, data: links })
  })

  // Search users (for adding to group)
  app.get('/search', { preHandler: requireAuth }, async (request, reply) => {
    const { q, groupId } = request.query as { q?: string; groupId?: string }

    if (!q || q.length < 2) {
      return reply.send({ success: true, data: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 20,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        avatarUrl: true,
      },
    })

    // Exclude already in group
    let result = users
    if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      })
      const memberIds = new Set(members.map(m => m.userId))
      result = users.filter(u => !memberIds.has(u.id))
    }

    return reply.send({ success: true, data: result })
  })

  // Add user to group by admin (search + add)
  app.post('/group/:groupId/members', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const { userId, role } = z.object({ userId: z.string(), role: z.enum(['ADMIN', 'STUDENT']).default('STUDENT') }).parse(request.body)

    const membership = await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, role },
      update: { isActive: true, role },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    })

    return reply.status(201).send({ success: true, data: membership })
  })
}