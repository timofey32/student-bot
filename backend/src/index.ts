import Fastify from 'fastify'
import { config } from './utils/config.js'
import { registerPlugins } from './plugins/index.js'
import { registerRoutes } from './routes/index.js'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    } : undefined
  }
})

async function start() {
  try {
    await registerPlugins(app)
    await registerRoutes(app)

    await app.listen({ port: config.PORT, host: config.HOST })
    app.log.info(`🚀 Backend running at http://${config.HOST}:${config.PORT}`)
    app.log.info(`📚 API docs: http://${config.HOST}:${config.PORT}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()