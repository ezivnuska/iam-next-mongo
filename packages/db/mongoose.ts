import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null }
global.mongoose = cached

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri)
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')

  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn

  // Connection is stale or missing — reset and reconnect
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  mongoose.set('bufferCommands', false)

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    }).then(m => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
