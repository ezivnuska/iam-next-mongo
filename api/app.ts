// api/app.ts
// Hono application — route mounting only, no server startup.
// Imported by server.ts (merged into the Next.js process) and by
// api/index.ts for standalone dev/testing.

import { Hono } from 'hono'

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

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

// Order matters: specific list routes before the generic :id route.
app.route('/', auth)
app.route('/', me)
app.route('/', avatar)
app.route('/', images)
app.route('/', users)
app.route('/', friendships)
app.route('/', ratings)
app.route('/', commissions)
app.route('/', notifications)
app.route('/', issuesList)
app.route('/', issuesRoot)
app.route('/', issueById)
app.route('/', issueSub)
app.route('/', stripeRoutes)
app.route('/', adminRoutes)

export default app
