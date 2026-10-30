import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { groupRoutes } from './groups.js'
import { pairRoutes } from './pairs.js'
import { attendanceRoutes } from './attendance.js'
import { subjectRoutes } from './subjects.js'
import { materialRoutes } from './materials.js'
import { homeworkRoutes } from './homeworks.js'
import { gradeRoutes } from './grades.js'
import { userRoutes } from './users.js'
import { notificationRoutes } from './notifications.js'
import { reportRoutes } from './reports.js'
import { settingsRoutes } from './settings.js'

export async function registerRoutes(app: FastifyInstance) {
  // API version prefix
  await app.register(async function (api) {
    // Public routes
    api.register(authRoutes, { prefix: '/auth' })

    // Protected routes
    api.register(groupRoutes, { prefix: '/groups' })
    api.register(pairRoutes, { prefix: '/pairs' })
    api.register(attendanceRoutes, { prefix: '/attendance' })
    api.register(subjectRoutes, { prefix: '/subjects' })
    api.register(materialRoutes, { prefix: '/materials' })
    api.register(homeworkRoutes, { prefix: '/homeworks' })
    api.register(gradeRoutes, { prefix: '/grades' })
    api.register(userRoutes, { prefix: '/users' })
    api.register(notificationRoutes, { prefix: '/notifications' })
    api.register(reportRoutes, { prefix: '/reports' })
    api.register(settingsRoutes, { prefix: '/settings' })

    // 404 for API
    api.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({
        success: false,
        error: 'API endpoint not found',
        path: request.url,
      })
    })
  }, { prefix: '/api/v1' })
}