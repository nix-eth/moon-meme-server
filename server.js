import 'dotenv/config'
import Fastify from 'fastify'
import FastifyCors from '@fastify/cors'
import View from '@fastify/view'
import Static from '@fastify/static'
import ejs from 'ejs'
import path from 'path'
import { fileURLToPath } from 'url'
const APP_PATH = path.dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({
  logger: true
})

import GenerateRoutes from './routes/generate.js'

fastify.get('/', async (request, reply) => {
  reply.headers({
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })
  return reply.view('/assets/index.ejs')
})

fastify.get('/:birdId(^\\d+)', async (request, reply) => {
  const birdId = request.params.birdId

  reply.headers({
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })

  if (isNaN(birdId) || birdId < 0 || birdId > 9999) {
    reply.code(404)
    return reply.send('Moonbird not found')
  }

  return reply.view('/assets/view.ejs', { birdId })
})

fastify.get('/style.css', async (request, reply) => {
  reply.headers({
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })
  return reply.sendFile('/assets/style.css')
})

fastify.get('/favicon.png', async (request, reply) => {
  reply.headers({
    'Cache-Control': 'public, max-age=604800'
  })
  return reply.sendFile('/assets/favicon.png')
})

async function main() {
  if (process.env.PORT === undefined) {
    throw new Error('Environment variable PORT is required.')
  }

  fastify.register(Static, {
    root: APP_PATH
  })

  await fastify.register(View, {
    engine: {
      ejs
    },
    root: APP_PATH
  })

  await fastify.register(FastifyCors, {
    origin: '*',
    methods: 'GET'
  })

  await fastify.register(GenerateRoutes)

  await fastify.listen({ port: parseInt(process.env.PORT), host: '0.0.0.0' })
}

main().catch(async (error) => {
  fastify.log.error(error)
  process.exit(1)
})
