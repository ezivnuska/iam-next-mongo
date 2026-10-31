## A Next.js App with MongoDB and Socket.IO

A Next.js application that uses MongoDB and Socket.IO.

### Key Technologies:
- **Next.js 15** (App Router)
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **NextAuth.js** for authentication
- **Hono** mobile REST API
- **Custom Node.js server** combining Next.js + Hono + Socket.IO in a single process

- [MongoDB Atlas](https://mongodb.com/atlas)
- [MongoDB Documentation](https://docs.mongodb.com/)

## Configuration

### Set up a MongoDB database

Set up a MongoDB database either locally or with [MongoDB Atlas for free](https://mongodb.com/atlas).

### Set up environment variables

Copy `.env.example` to `.env` and fill in each variable:

```bash
cp .env.example .env
```

See `.env.example` for descriptions of all required variables. Key ones:
- `MONGO_URI` — MongoDB connection string (Atlas or local)
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — same value, 32+ char random string
- `NEXT_PUBLIC_APP_URL` — full public URL (used by Socket.IO CORS)

### Install dependencies and run

```bash
pnpm install
pnpm dev
```

Your app should be up and running on [http://localhost:3000](http://localhost:3000)!

---

## API Architecture (Important)

This app has **two distinct API layers** that serve different clients. Understanding the routing is critical — confusing them will lead to unreachable code.

### Request routing (server.ts)

```
Incoming request
  ├── /api/mobile/**  → Hono app (api/app.ts)        ← mobile clients / iam-games
  ├── /api/socket/io  → Socket.IO server              ← WebSocket clients
  └── everything else → Next.js                       ← web browser
```

The routing decision happens in `server.ts` before Next.js processes anything:
```ts
if (req.url?.startsWith('/api/mobile/')) {
  return await honoHandler(req, res)  // Hono intercepts first
}
await handle(req, res, parsedUrl)     // Next.js handles the rest
```

**The `app/api/mobile/` directory contains dead code.** Those Next.js route handlers were superseded by the Hono API (`api/routes/mobile/`) but were never deleted. They compile and look functional but are never reached in production because Hono intercepts `/api/mobile/` first. Do not add logic there.

### API layers

| Layer | Location | Serves | Auth |
|-------|----------|--------|------|
| Hono mobile API | `api/routes/mobile/` | Mobile app + iam-games | JWT (Bearer token) |
| Next.js API routes | `app/api/` | Web browser | NextAuth session cookie |
| Server actions | `app/lib/actions/` | Web browser (RSC) | NextAuth session |

### Shared code

Both API layers import from `app/lib/`:
- `app/lib/models/` — Mongoose schemas (single source of truth for DB)
- `app/lib/definitions/` — TypeScript types and Zod schemas
- `app/lib/utils/` — Shared utilities
- `app/lib/mobile/` — Serializers and helpers for mobile API responses

---

## Custom Server with Socket.IO

This app uses a **custom Node.js server** (`server.ts`) that runs Next.js, Hono, and Socket.IO on the same port.

### How It Works

1. `server.ts` creates an HTTP server
2. `/api/mobile/` requests are forwarded to Hono before Next.js
3. Next.js handles all other HTTP requests (pages, API routes, etc.)
4. Socket.IO attaches to the same server for WebSocket connections
5. The `io` instance is stored globally for use in server actions and Hono routes

### Running the App

```bash
# Development (runs custom server)
pnpm dev

# Production
pnpm build
pnpm start

# Standard Next.js dev (without Socket.IO)
pnpm next:dev
```

### Pros of Custom Server

✅ **Full Socket.IO functionality** - All features work (rooms, namespaces, middleware)
✅ **Single port/process** - Simpler architecture, no CORS issues
✅ **Shared state** - Socket.IO accessible from server actions
✅ **Production ready** - Works with PM2, Docker, Kubernetes
✅ **No external dependencies** - No separate Socket.IO service needed

### Cons of Custom Server

❌ **Manual server management** - Need PM2, monitoring, health checks
❌ **Scaling complexity** - Requires Redis adapter for horizontal scaling
❌ **HMR limitations** - Changes to `server.ts` require full restart

---

## Deployment

**This app cannot be deployed to Vercel** due to the custom server requirement. It is deployed to a DigitalOcean droplet via PM2. See `DEPLOYMENT.md` for the full setup guide.

### Branches

| Branch | URL | Deploy command |
|--------|-----|----------------|
| `main` | https://iameric.me | `./deploy.sh` |
| `staging` | https://staging.iameric.me | `./deploy.sh --branch staging --env staging` |

### Deploy script

```bash
# Production (default)
./deploy.sh

# Staging
./deploy.sh --branch staging --env staging

# Force clean build
./deploy.sh --clean
```

For all deployments, ensure you:
- Set environment variables (see `.env.example`)
- Use PM2 or similar for process management
- Configure health checks
- Set up SSL/HTTPS
