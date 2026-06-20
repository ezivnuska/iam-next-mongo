// api/index.ts
// Standalone Hono server — for local dev and testing only.
// In production the Hono app is absorbed into the Next.js custom server (server.ts).

import { config } from 'dotenv'
import { expand } from 'dotenv-expand'

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
expand(config({ path: envFile }))
config({ path: '.env' })

import { serve } from '@hono/node-server'
import { connectToDatabase } from '../app/lib/mongoose'
import app from './app'

const PORT = parseInt(process.env.API_PORT ?? '3001', 10)

connectToDatabase()
  .then(() => {
    console.log('[api] MongoDB connected')
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log(`[api] Standalone Hono server listening on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[api] Failed to connect to MongoDB:', err)
    process.exit(1)
  })

export default app
