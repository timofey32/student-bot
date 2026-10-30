import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { requireAuth, requireGroupMember, requireGroupAdmin } from '../middleware/auth.js'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'

const uploadReportCardSchema = z.object({
  groupId: z.string(),
  studentId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.string(),
})

export async function reportRoutes(app: FastifyInstance) {
  // Get report cards for student
  app.get('/report-cards', { preHandler: requireAuth }, async (request, reply) => {
    const { groupId, studentId } = request.query as { groupId?: string; studentId?: string }

    const targetStudentId = studentId || request.auth!.userId

    // Check permissions
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth!.userId, groupId: groupId || '' } },
    })

    if (targetStudentId !== request.auth!.userId) {
      if (!membership || !['SUPER_ADMIN', 'ADMIN', 'PARENT'].includes(membership.role)) {
        return reply.status(403).send({ success: false, error: 'Access denied' })
      }
      // Parents need to be linked
      if (membership.role === 'PARENT') {
        const link = await prisma.parentStudent.findUnique({
          where: { parentId_studentId_groupId: { parentId: request.auth!.userId, studentId: targetStudentId, groupId: groupId! } },
        })
        if (!link) return reply.status(403).send({ success: false, error: 'Not linked to this student' })
      }
    }

    const where: any = { studentId: targetStudentId }
    if (groupId) where.groupId = groupId

    const reports = await prisma.reportCard.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    })

    return reply.send({ success: true, data: reports })
  })

  // Upload report card (admin)
  app.post('/report-cards', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const membership = (request as any).membership
    const data = uploadReportCardSchema.parse({ ...(request.body as object), groupId: membership.groupId, uploadedBy: request.auth!.userId })

    const report = await prisma.reportCard.create({ data })

    return reply.status(201).send({ success: true, data: report })
  })

  // Generate attendance report (PDF)
  app.get('/attendance/pdf', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId, from, to, subjectId } = request.query as {
      groupId?: string
      from?: string
      to?: string
      subjectId?: string
    }

    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'groupId required' })
    }

    const membership = (request as any).membership
    if (membership.groupId !== groupId) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    const where: any = { groupId, isActive: true }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const pairs = await prisma.pair.findMany({
      where,
      include: {
        subject: true,
        attendances: {
          include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true } } },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const students = await prisma.groupMember.findMany({
      where: { groupId, isActive: true, role: 'STUDENT' },
      include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true } } },
      orderBy: { user: { lastName: 'asc' } },
    })

    // Generate PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="attendance-report-${groupId}.pdf"`)
    doc.pipe(reply.raw)

    // Title
    doc.fontSize(18).text('Attendance Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Group: ${membership.group.name}`, { align: 'center' })
    doc.text(`Period: ${from ? new Date(from).toLocaleDateString() : 'All'} - ${to ? new Date(to).toLocaleDateString() : 'Present'}`, { align: 'center' })
    doc.moveDown(2)

    // Table header
    const colWidths = [120, 80, 80, ...pairs.map(() => 50)]
    const headers = ['Student', 'Present', 'Absent', ...pairs.map(p => `${p.date.toISOString().split('T')[0]}\n${p.startTime}`)]

    let y = doc.y
    const rowHeight = 20

    // Draw header
    doc.fontSize(8).font('Helvetica-Bold')
    let x = 30
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i], align: i === 0 ? 'left' : 'center' })
      x += colWidths[i]
    })
    y += rowHeight

    // Draw rows
    doc.font('Helvetica').fontSize(7)
    for (const student of students) {
      x = 30
      const name = `${student.user.lastName} ${student.user.firstName} ${student.user.middleName || ''}`.trim()
      doc.text(name, x, y, { width: colWidths[0] })
      x += colWidths[0]

      let present = 0, absent = 0
      for (const pair of pairs) {
        const att = pair.attendances.find(a => a.userId === student.userId)
        const status = att?.status || 'PENDING'
        if (status === 'PRESENT') present++
        if (status === 'ABSENT') absent++

        const symbol = status === 'PRESENT' ? '✓' : status === 'ABSENT' ? '✗' : status === 'LATE' ? '⏱' : status === 'EXCUSED' ? '✓' : '?'
        doc.text(symbol, x, y, { width: colWidths[2 + pairs.indexOf(pair)], align: 'center' })
        x += colWidths[2 + pairs.indexOf(pair)]
      }

      doc.text(String(present), x - colWidths[1] - colWidths[2], y, { width: colWidths[1], align: 'center' })
      doc.text(String(absent), x - colWidths[2], y, { width: colWidths[2], align: 'center' })

      y += rowHeight
      if (y > 550) { doc.addPage(); y = 30 }
    }

    doc.end()
  })

  // Generate grades report (Excel)
  app.get('/grades/excel', { preHandler: [requireAuth, requireGroupAdmin] }, async (request, reply) => {
    const { groupId, from, to } = request.query as { groupId?: string; from?: string; to?: string }

    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'groupId required' })
    }

    const membership = (request as any).membership
    if (membership.groupId !== groupId) {
      return reply.status(403).send({ success: false, error: 'Access denied' })
    }

    const where: any = { groupId }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, middleName: true } },
        subject: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { subject: { name: 'asc' } }, { date: 'asc' }],
    })

    const students = await prisma.groupMember.findMany({
      where: { groupId, isActive: true, role: 'STUDENT' },
      include: { user: { select: { id: true, firstName: true, lastName: true, middleName: true } } },
      orderBy: { user: { lastName: 'asc' } },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Grades')

    // Headers
    sheet.columns = [
      { header: 'Student', key: 'student', width: 30 },
      { header: 'Subject', key: 'subject', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Value', key: 'value', width: 10 },
      { header: 'Max', key: 'maxValue', width: 10 },
      { header: 'Weight', key: 'weight', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Comment', key: 'comment', width: 30 },
    ]

    for (const g of grades) {
      sheet.addRow({
        student: `${g.user.lastName} ${g.user.firstName} ${g.user.middleName || ''}`.trim(),
        subject: g.subject.name,
        type: g.type,
        title: g.title,
        value: g.value,
        maxValue: g.maxValue,
        weight: g.weight,
        date: g.date.toISOString().split('T')[0],
        comment: g.comment || '',
      })
    }

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename="grades-report-${groupId}.xlsx"`)
    await workbook.xlsx.write(reply.raw)
    reply.raw.end()
  })
}