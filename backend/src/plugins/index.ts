import { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import staticFiles from '@fastify/static'
import { config } from '../utils/config.js'
import { prisma } from '../utils/prisma.js'
import path from 'path'

// Use process.cwd() for uploads directory (works in both dev and prod)
const uploadsDir = path.join(process.cwd(), config.UPLOAD_DIR)

export async function registerPlugins(app: FastifyInstance) {
  // CORS
  await app.register(cors, {
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // JWT
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  })

  // Static files (uploads)
  await app.register(staticFiles, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Decorators
  app.decorate('prisma', prisma)
  app.decorate('config', config)

  // Auth hook
  app.addHook('preHandler', async (request, reply) => {
    request.auth = null
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7)
        const decoded = await request.jwtVerify<{ userId: string; role: string }>()
        request.auth = decoded
      } catch {
        // Invalid token - leave auth as null
      }
    }
  })

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error)

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Validation Error',
        details: error.validation,
      })
    }

    if (error.statusCode === 401) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      })
    }

    if (error.statusCode === 403) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
      })
    }

    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        error: 'Not Found',
      })
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal Server Error',
      message: config.NODE_ENV === 'development' ? error.message : undefined,
    })
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: { userId: string; role: string } | null
  }
}