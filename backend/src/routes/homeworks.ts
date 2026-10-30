import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'

const createHomeworkSchema = z.object({
  groupId: z.string(),
  subjectId: z.string(),
  pairId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  maxScore: z.number().int().positive().default(100),
  attachments: z.array(z.string().url()).default([]),
})

const updateHomeworkSchema = createHomeworkSchema.partial().omit({ groupId: true })

const submitHomeworkSchema = z.object({
  homeworkId: z.string(),
  content: z.string().optional(),
  attachments: z.array(z.string().url()).default([]),
})

const gradeHomeworkSchema = z.object({
  submissionId: z.string(),
  score: z.number().int().min(0),
  feedback: z.string().optional(),
  status: z.enum(['CHECKED', 'ACCEPTED', 'REJECTED']).default('CHECKED'),
})

export async function homeworkRoutes(app: FastifyInstance) {
  // Get homeworks for group
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, subjectId, status } = request.query as {
      groupId?: string
      subjectId?: string
      status?: string
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

    const where: any = { groupId, isActive: true }
    if (subjectId) where.subjectId = subjectId

    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
        pair: { select: { id: true, title: true, date: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { deadline: 'asc' },
    })

    // Include user's submission
    let submissions: Record<string, any> = {}
    if (membership.role === 'STUDENT') {
      const userSubmissions = await prisma.homeworkSubmission.findMany({
        where: { homeworkId: { in: homeworks.map(h => h.id) }, userId: request.auth!.userId },
      })
      submissions = Object.fromEntries(userSubmissions.map(s => [s.homeworkId, s]))
    }

    return reply.send({
      success: true,
      data: homeworks.map(h => ({
        ...h,
        mySubmission: submissions[h.id] || null,
      })),
    })
  })

  // Get single homework with submissions (admin)
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const homework = await prisma.homework.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, shortName: true, color: true } },
        pair: { select: { id: true, title: true, date: true } },
        submissions: {
          include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true, avatarUrl: true } } },
          orderBy: { submittedAt: 'asc' },
        },
      },
    })

    if (!homework) {
      return reply.status(404).send({ success: false, error: 'Homework not found' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: homework.groupId } },
    })
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    // Students only see their own submission
    if (membership.role === 'STUDENT') {
      homework.submissions = homework.submissions.filter(s => s.userId === request.auth!.userId)
    }

    return reply.send({ success: true, data: homework })
  })

  // Create homework (admin)
  app.post('/', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = createHomeworkSchema.parse({ ...(request.body as object), groupId: membership.groupId })

    const homework = await prisma.homework.create({
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.status(201).send({ success: true, data: homework })
  })

  // Update homework (admin)
  app.patch('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateHomeworkSchema.parse(request.body)

    const homework = await prisma.homework.update({
      where: { id },
      data,
      include: { subject: { select: { id: true, name: true, shortName: true, color: true } } },
    })

    return reply.send({ success: true, data: homework })
  })

  // Delete homework (admin)
  app.delete('/:id', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.homework.update({ where: { id }, data: { isActive: false } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // Submit homework (student)
  app.post('/submit', { preHandler: requireAuth }, async (request, reply) => {
    const data = submitHomeworkSchema.parse(request.body)
    const userId = request.auth!.userId

    const homework = await prisma.homework.findUnique({ where: { id: data.homeworkId } })
    if (!homework) {
      return reply.status(404).send({ success: false, error: 'Homework not found' })
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: homework.groupId } },
    })
    if (!membership || membership.role !== 'STUDENT') {
      return reply.status(403).send({ success: false, error: 'Only students can submit homework' })
    }

    const existing = await prisma.homeworkSubmission.findUnique({
      where: { homeworkId_userId: { homeworkId: data.homeworkId, userId } },
    })

    let submission
    const isLate = new Date() > new Date(homework.deadline)

    if (existing) {
      submission = await prisma.homeworkSubmission.update({
        where: { id: existing.id },
        data: {
          content: data.content,
          attachments: data.attachments,
          status: isLate ? 'LATE' : 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
    } else {
      submission = await prisma.homeworkSubmission.create({
        data: {
          homeworkId: data.homeworkId,
          userId,
          content: data.content,
          attachments: data.attachments,
          status: isLate ? 'LATE' : 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
    }

    return reply.send({ success: true, data: submission })
  })

  // Grade homework (admin)
  app.post('/grade', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const data = gradeHomeworkSchema.parse(request.body)

    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: data.submissionId },
      include: { homework: true },
    })

    if (!submission) {
      return reply.status(404).send({ success: false, error: 'Submission not found' })
    }

    // Verify admin has access to this group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: submission.homework.groupId } },
    })
    if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    const updated = await prisma.homeworkSubmission.update({
      where: { id: data.submissionId },
      data: {
        score: data.score,
        feedback: data.feedback,
        status: data.status,
        checkedAt: new Date(),
        checkedBy: request.auth!.userId,
      },
    })

    return reply.send({ success: true, data: updated })
  })
}