import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/prisma.js'

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (!request.auth) {
    return reply.status(401).send({ success: false, error: 'Authentication required' })
  }
  done()
}

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      return reply.status(401).send({ success: false, error: 'Authentication required' })
    }

    if (!roles.includes(request.auth.role)) {
      return reply.status(403).send({ success: false, error: 'Insufficient permissions' })
    }
  }
}

export function requireGroupMember(requiredRoles?: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      return reply.status(401).send({ success: false, error: 'Authentication required' })
    }

    const groupId = (request.params as any).id || (request.body as any).groupId || (request.query as any).groupId

    if (!groupId) {
      return reply.status(400).send({ success: false, error: 'Group ID required' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: request.auth.userId, groupId } },
    })

    if (!membership || !membership.isActive) {
      return reply.status(403).send({ success: false, error: 'Not a member of this group' })
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      return reply.status(403).send({ success: false, error: 'Insufficient permissions in this group' })
    }

    // Attach membership to request for use in routes
    ;(request as any).membership = membership
  }
}

export function requireGroupAdmin() {
  return requireGroupMember(['SUPER_ADMIN', 'ADMIN'])
}

export function requireSuperAdmin() {
  return requireRole(['SUPER_ADMIN'])
}