import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const markAttendanceSchema = z.object({
  pairId: z.string(),
  userId: z.string().optional(), // For admin marking others
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  note: z.string().optional(),
})

const bulkMarkSchema = z.object({
  pairId: z.string(),
  attendances: z.array(z.object({
    userId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    note: z.string().optional(),
  })),
})

export async function attendanceRoutes(app: FastifyInstance) {
  // Mark own attendance (student)
  app.post('/mark', { preHandler: requireAuth }, async (request, reply) => {
    const data = markAttendanceSchema.parse(request.body)
    const userId = request.auth!.userId

    // Verify pair exists and user is member
    const pair = await prisma.pair.findUnique({
      where: { id: data.pairId },
      include: { group: true },
    })

    if (!pair) {
      return reply.status(404).send({ success: false, error: 'Pair not found' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: pair.groupId } },
    })

    if (!membership || membership.role !== 'STUDENT') {
      return reply.status(403).send({ success: false, error: 'Only students can mark own attendance' })
    }

    // Check if already marked
    const existing = await prisma.attendance.findUnique({
      where: { pairId_userId: { pairId: data.pairId, userId } },
    })

    let attendance
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: data.status, markedAt: new Date(), markedBy: userId, note: data.note },
      })
    } else {
      attendance = await prisma.attendance.create({
        data: { pairId: data.pairId, userId, status: data.status, markedAt: new Date(), markedBy: userId, note: data.note },
      })
    }

    return reply.send({ success: true, data: attendance })
  })

  // Bulk mark attendance (admin)
  app.post('/bulk', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = bulkMarkSchema.parse(request.body)

    // Verify pair belongs to group
    const pair = await prisma.pair.findUnique({ where: { id: data.pairId } })
    if (!pair || pair.groupId !== membership.groupId) {
      return reply.status(404).send({ success: false, error: 'Pair not found in this group' })
    }

    const results = await Promise.all(
      data.attendances.map(async (a) => {
        const existing = await prisma.attendance.findUnique({
          where: { pairId_userId: { pairId: data.pairId, userId: a.userId } },
        })

        if (existing) {
          return prisma.attendance.update({
            where: { id: existing.id },
            data: { status: a.status, markedAt: new Date(), markedBy: request.auth!.userId, note: a.note },
          })
        } else {
          return prisma.attendance.create({
            data: { pairId: data.pairId, userId: a.userId, status: a.status, markedAt: new Date(), markedBy: request.auth!.userId, note: a.note },
          })
        }
      })
    )

    return reply.send({ success: true, data: results })
  })

  // Get attendance stats for group
  app.get('/stats', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, from, to, userId } = request.query as {
      groupId?: string
      from?: string
      to?: string
      userId?: string
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

    const targetUserId = userId || request.auth!.userId

    // Students can only see their own stats unless admin
    if (targetUserId !== request.auth!.userId && !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Can only view own stats' })
    }

    const where: any = { userId: targetUserId, pair: { groupId } }
    if (from || to) {
      where.pair.date = {}
      if (from) where.pair.date.gte = new Date(from)
      if (to) where.pair.date.lte = new Date(to)
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: { pair: { select: { id: true, date: true, subjectId: true, subject: { select: { name: true, shortName: true, color: true } } } } },
    })

    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      late: attendances.filter(a => a.status === 'LATE').length,
      excused: attendances.filter(a => a.status === 'EXCUSED').length,
      pending: attendances.filter(a => a.status === 'PENDING').length,
      bySubject: {} as Record<string, any>,
    }

    // Group by subject
    for (const a of attendances) {
      const subjName = a.pair.subject?.name || 'Unknown'
      if (!stats.bySubject[subjName]) {
        stats.bySubject[subjName] = { total: 0, present: 0, absent: 0, late: 0, excused: 0, color: a.pair.subject?.color || '#3B82F6' }
      }
      stats.bySubject[subjName].total++
      stats.bySubject[subjName][a.status.toLowerCase()]++
    }

    return reply.send({ success: true, data: stats })
  })

  // Get attendance for specific pair (admin view)
  app.get('/pair/:pairId', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { pairId } = request.params as { pairId: string }

    const pair = await prisma.pair.findUnique({
      where: { id: pairId },
      include: {
        group: true,
        attendances: {
          include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
        },
      },
    })

    if (!pair) {
      return reply.status(404).send({ success: false, error: 'Pair not found' })
    }

    // Get all students in group
    const students = await prisma.groupMember.findMany({
      where: { groupId: pair.groupId, isActive: true, role: 'STUDENT' },
      include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
      orderBy: { user: { lastName: 'asc' } },
    })

    const attendanceMap = Object.fromEntries(pair.attendances.map(a => [a.userId, a]))

    return reply.send({
      success: true,
      data: {
        pair,
        students: students.map(s => ({
          ...s.user,
          attendance: attendanceMap[s.userId] || { status: 'PENDING', markedAt: null },
        })),
      },
    })
  })
}