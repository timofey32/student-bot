import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const createPairSchema = z.object({
  groupId: z.string(),
  subjectId: z.string(),
  title: z.string().min(1).max(200),
  type: z.enum(['LECTURE', 'PRACTICE', 'LAB', 'EXAM', 'CONSULTATION']).default('LECTURE'),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  room: z.string().optional(),
  description: z.string().optional(),
})

const updatePairSchema = createPairSchema.partial()

export async function pairRoutes(app: FastifyInstance) {
  // Get pairs for group (with filters)
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, subjectId, from, to, status } = request.query as {
      groupId?: string
      subjectId?: string
      from?: string
      to?: string
      status?: string
    }

    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'groupId required' })
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Not a member of this group' })
    }

    const where: any = { groupId, isActive: true }
    if (subjectId) where.subjectId = subjectId
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const pairs = await prisma.pair.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
        _count: { select: { attendances: true, homeworks: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    // If student, include their attendance status
    let attendances: Record<string, any> = {}
    if (membership.role === 'STUDENT' || membership.role === 'PARENT') {
      const userAttendances = await prisma.attendance.findMany({
        where: { pairId: { in: pairs.map(p => p.id) }, userId: request.auth!.userId },
      })
      attendances = Object.fromEntries(userAttendances.map(a => [a.pairId, a]))
    }

    return reply.send({
      success: true,
      data: pairs.map(p => ({
        ...p,
        myAttendance: attendances[p.id] || null,
      })),
    })
  })

  // Get today's pairs for group (main screen)
  app.get('/today', { preHandler: requireAuth }, async (request, reply) => {
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const pairs = await prisma.pair.findMany({
      where: {
        groupId,
        isActive: true,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
        attendances: {
          where: { userId: request.auth!.userId },
          take: 1,
        },
        homeworks: {
          where: { isActive: true },
          select: { id: true, title: true, deadline: true, maxScore: true },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    // Get all attendances for this group today (for admin view)
    let allAttendances: Record<string, any[]> = {}
    if (['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      const attendances = await prisma.attendance.findMany({
        where: { pairId: { in: pairs.map(p => p.id) } },
        include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
      })
      for (const a of attendances) {
        if (!allAttendances[a.pairId]) allAttendances[a.pairId] = []
        allAttendances[a.pairId].push(a)
      }
    }

    // Get group members for attendance marking
    const members = await prisma.groupMember.findMany({
      where: { groupId, isActive: true, role: 'STUDENT' },
      include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
      orderBy: { user: { lastName: 'asc' } },
    })

    return reply.send({
      success: true,
      data: {
        pairs: pairs.map(p => ({
          ...p,
          myAttendance: p.attendances[0] || null,
          allAttendances: allAttendances[p.id] || [],
          homeworks: p.homeworks,
        })),
        members: members.map(m => m.user),
      },
    })
  })

  // Get single pair
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const pair = await prisma.pair.findUnique({
      where: { id },
      include: {
        subject: true,
        group: { select: { id: true, name: true, code: true } },
        attendances: {
          include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
        },
        homeworks: { where: { isActive: true } },
      },
    })

    if (!pair) {
      return reply.status(404).send({ success: false, error: 'Pair not found' })
    }

    // Verify access
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: pair.groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    return reply.send({ success: true, data: pair })
  })

  // Create pair (admin)
  app.post('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = createPairSchema.parse({ ...(request.body as object), groupId: membership.groupId })

    const pair = await prisma.pair.create({
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    // Create attendance records for all students (PENDING)
    const students = await prisma.groupMember.findMany({
      where: { groupId: membership.groupId, isActive: true, role: 'STUDENT' },
      select: { userId: true },
    })

    await prisma.attendance.createMany({
      data: students.map(s => ({ pairId: pair.id, userId: s.userId, status: 'PENDING' })),
      skipDuplicates: true,
    })

    return reply.status(201).send({ success: true, data: pair })
  })

  // Update pair (admin)
  app.patch('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updatePairSchema.parse(request.body)

    const pair = await prisma.pair.update({
      where: { id },
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.send({ success: true, data: pair })
  })

  // Delete pair (admin)
  app.delete('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.pair.update({ where: { id }, data: { isActive: false } })
    return reply.send({ success: true, data: { deleted: true } })
  })
}