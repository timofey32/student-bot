import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const createGradeSchema = z.object({
  groupId: z.string(),
  subjectId: z.string(),
  userId: z.string(),
  pairId: z.string().optional(),
  type: z.enum(['HOMEWORK', 'QUIZ', 'MIDTERM', 'EXAM', 'PROJECT', 'PARTICIPATION', 'BONUS']),
  title: z.string().min(1).max(200),
  value: z.number(),
  maxValue: z.number().positive().default(100),
  weight: z.number().positive().default(1.0),
  date: z.string().datetime(),
  comment: z.string().optional(),
})

const updateGradeSchema = createGradeSchema.partial().omit({ groupId: true })

const bulkGradeSchema = z.object({
  subjectId: z.string(),
  grades: z.array(z.object({
    userId: z.string(),
    type: z.enum(['HOMEWORK', 'QUIZ', 'MIDTERM', 'EXAM', 'PROJECT', 'PARTICIPATION', 'BONUS']),
    title: z.string().min(1).max(200),
    value: z.number(),
    maxValue: z.number().positive().default(100),
    weight: z.number().positive().default(1.0),
    date: z.string().datetime(),
    comment: z.string().optional(),
  })),
})

export async function gradeRoutes(app: FastifyInstance) {
  // Get grades for group/user
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, subjectId, userId, from, to } = request.query as {
      groupId?: string
      subjectId?: string
      userId?: string
      from?: string
      to?: string
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

    // Students can only see their own grades unless admin
    if (targetUserId !== request.auth!.userId && !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Can only view own grades' })
    }

    const where: any = { groupId, userId: targetUserId }
    if (subjectId) where.subjectId = subjectId
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
        pair: { select: { id: true, title: true, date: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    })

    return reply.send({ success: true, data: grades })
  })

  // Get grade summary (average by subject)
  app.get('/summary', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, userId, from, to } = request.query as {
      groupId?: string
      userId?: string
      from?: string
      to?: string
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

    if (targetUserId !== request.auth!.userId && !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Can only view own summary' })
    }

    const where: any = { groupId, userId: targetUserId }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const grades = await prisma.grade.findMany({
      where,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    // Calculate weighted average by subject
    const bySubject: Record<string, { grades: any[]; totalWeight: number; weightedSum: number }> = {}

    for (const g of grades) {
      const key = g.subjectId
      if (!bySubject[key]) {
        bySubject[key] = { grades: [], totalWeight: 0, weightedSum: 0, subject: g.subject }
      }
      bySubject[key].grades.push(g)
      bySubject[key].totalWeight += g.weight
      bySubject[key].weightedSum += (g.value / g.maxValue) * 100 * g.weight
    }

    const summary = Object.entries(bySubject).map(([subjectId, data]) => ({
      subject: data.subject,
      grades: data.grades,
      average: data.totalWeight > 0 ? data.weightedSum / data.totalWeight : 0,
      count: data.grades.length,
    }))

    // Overall average
    const allGrades = grades.filter(g => g.type !== 'BONUS')
    const overallWeight = allGrades.reduce((sum, g) => sum + g.weight, 0)
    const overallSum = allGrades.reduce((sum, g) => sum + (g.value / g.maxValue) * 100 * g.weight, 0)
    const overallAverage = overallWeight > 0 ? overallSum / overallWeight : 0

    return reply.send({
      success: true,
      data: { bySubject: summary, overallAverage, totalGrades: grades.length },
    })
  })

  // Create grade (admin)
  app.post('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = createGradeSchema.parse({ ...request.body, groupId: membership.groupId, createdBy: request.auth!.userId })

    const grade = await prisma.grade.create({
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.status(201).send({ success: true, data: grade })
  })

  // Bulk create grades (admin)
  app.post('/bulk', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = bulkGradeSchema.parse(request.body)

    const results = await Promise.all(
      data.grades.map(g =>
        prisma.grade.create({
          data: { ...g, groupId: membership.groupId, createdBy: request.auth!.userId },
          include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
        })
      )
    )

    return reply.status(201).send({ success: true, data: results })
  })

  // Update grade (admin)
  app.patch('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateGradeSchema.parse(request.body)

    const grade = await prisma.grade.update({
      where: { id },
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.send({ success: true, data: grade })
  })

  // Delete grade (admin)
  app.delete('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.grade.delete({ where: { id } })
    return reply.send({ success: true, data: { deleted: true } })
  })
}