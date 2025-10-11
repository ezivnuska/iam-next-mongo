## A Next.js App with MongoDB and Socket.IO

A Next.js application that uses MongoDB and Socket.IO.

### Key Technologies:
- **Next.js 14** (App Router)
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **NextAuth.js** for authentication
- **Custom Node.js server** for Socket.IO integration

- [MongoDB Atlas](https://mongodb.com/atlas)
- [MongoDB Documentation](https://docs.mongodb.com/)

## Configuration

### Set up a MongoDB database

Set up a MongoDB database either locally or with [MongoDB Atlas for free](https://mongodb.com/atlas).

### Set up environment variables

Set each variable on `.env`:

- `MONGODB_URI` - Your MongoDB connection string. If you are using [MongoDB Atlas](https://mongodb.com/atlas) you can find this by clicking the "Connect" button for your cluster.

### Install dependencies and run

```bash
pnpm install
pnpm dev
```

Your app should be up and running on [http://localhost:3000](http://localhost:3000)!

**Note:** This app uses a custom server (`server.js`) to run Socket.IO alongside Next.js. The `pnpm dev` command runs `node server.js` instead of the standard `next dev`.

When you are successfully connected to MongoDB, you can refer to the [MongoDB Node.js Driver docs](https://mongodb.github.io/node-mongodb-native/3.4/tutorials/collections/) for further instructions.

---

## Custom Server with Socket.IO

This app uses a **custom Node.js server** (`server.js`) that runs both Next.js and Socket.IO on the same port.

### How It Works

1. `server.js` creates an HTTP server
2. Next.js handles all HTTP requests (pages, API routes, etc.)
3. Socket.IO attaches to the same server for WebSocket connections
4. The `io` instance is stored globally for use in server actions

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
❌ **HMR limitations** - Changes to `server.js` require full restart

### When to Use Custom Server

**Use if:**
- You need real-time bidirectional communication
- Deploying to your own infrastructure (not Vercel)
- Want low-latency real-time features (chat, live updates)
- Have moderate traffic levels

**Don't use if:**
- Must deploy to Vercel
- Want zero server management (prefer serverless)
- Building a simple app without real-time needs
- Prefer polling or Server-Sent Events

### Alternative Approaches

**Option 1: Separate Socket.IO Service**
Deploy Next.js to Vercel, Socket.IO separately. More complex but scalable.

**Option 2: Server-Sent Events (SSE)**
One-way server→client communication. Works with Vercel but limited functionality.

**Option 3: Polling**
Simple but high latency and server overhead.

### Recommendation for This App

Custom server is the right choice because:
- Friendship requests, comments, and likes benefit from instant updates
- Likely deploying to VPS/cloud (not Vercel)
- Monolithic architecture
- Simplest real-time implementation

**Trade-off:** Manual server management in exchange for full real-time capabilities.

---

## Deployment

**This app cannot be deployed to Vercel** due to the custom server requirement.

### Recommended Deployment Options:

1. **Railway** - Easiest for custom servers
2. **Render** - Free tier available
3. **DigitalOcean App Platform**
4. **AWS EC2 / Lightsail**
5. **Heroku** (with Procfile)

For all deployments, ensure you:
- Set environment variables (MongoDB URI, NextAuth secrets, etc.)
- Use PM2 or similar for process management
- Configure health checks
- Set up SSL/HTTPS
