// api/index.ts
// Standalone Hono HTTP server for all mobile API routes.
//
// Run with:
//   tsx api/index.ts           (one-shot)
//   tsx watch api/index.ts     (dev with hot reload)
//
// Mobile app base URL:
//   The Expo app (iam-expo) reads EXPO_PUBLIC_API_URL (see lib/api/client.ts).
//   In development point it to http://<your-local-ip>:3001
//   In production point it to https://iameric.me (nginx proxies /api/mobile/** → port 3001)
//
// Socket.IO note:
//   Socket events are emitted via an internal HTTP call to
//   http://localhost:3000/api/socket/emit (the Next.js / server.js process).
//   The Hono server does NOT host Socket.IO itself.

import { config } from 'dotenv'
import { expand } from 'dotenv-expand'

// Load environment vars the same way server.js does
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
expand(config({ path: envFile }))
config({ path: '.env' })

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { connectToDatabase } from '../app/lib/mongoose'

// ─── Route modules ───────────────────────────────────────────────────────────
import auth from './routes/mobile/auth'
import me from './routes/mobile/me'
import avatar from './routes/mobile/avatar'
import images from './routes/mobile/images'
import users from './routes/mobile/users'
import friendships from './routes/mobile/friendships'
import ratings from './routes/mobile/ratings'
import commissions from './routes/mobile/commissions'
import notifications from './routes/mobile/notifications'
import issuesList from './routes/mobile/issues/lists'
import issuesRoot from './routes/mobile/issues/index'
import issueById from './routes/mobile/issues/[id]'
import issueSub from './routes/mobile/issues/sub'
import stripeRoutes from './routes/mobile/stripe/index'
import adminRoutes from './routes/mobile/admin/index'

// ─── App ─────────────────────────────────────────────────────────────────────
const app = new Hono()

// Health check
app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

// Mount route modules
// Order matters: more-specific list routes (feed/counts/etc) must be registered
// BEFORE the generic :id route so Hono doesn't swallow them as IDs.
app.route('/', auth)
app.route('/', me)
app.route('/', avatar)
app.route('/', images)
app.route('/', users)
app.route('/', friendships)
app.route('/', ratings)
app.route('/', commissions)
app.route('/', notifications)
app.route('/', issuesList)    // /api/mobile/issues/feed, /counts, /nearby, /work, /flagged
app.route('/', issuesRoot)    // /api/mobile/issues (GET list + POST create)
app.route('/', issueById)     // /api/mobile/issues/:id (GET/PATCH/DELETE)
app.route('/', issueSub)      // /api/mobile/issues/:id/applicants, pledges, commission, etc.
app.route('/', stripeRoutes)
app.route('/', adminRoutes)

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.API_PORT ?? '3001', 10)

connectToDatabase()
  .then(() => {
    console.log('[api] MongoDB connected')
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log(`[api] Hono server listening on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[api] Failed to connect to MongoDB:', err)
    process.exit(1)
  })

export default app
