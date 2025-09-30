// import mongoose from "mongoose";

// if (!process.env.MONGO_URI) {
//   throw new Error('Invalid/Missing environment variable: "MONGO_URI"');
// }

// const uri: string = process.env.MONGO_URI;

// interface MongooseCache {
//   conn: typeof mongoose | null
//   promise: Promise<typeof mongoose> | null
// }

// // 👇 Extend Node's global type
// declare global {
//   // eslint-disable-next-line no-var
//   var mongoose: MongooseCache | undefined
// }

// // 👇 Always ensure cached is initialized
// const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null }
// global.mongoose = cached

// export default async function connectDB() {
//   if (cached.conn) return cached.conn

//   if (!cached.promise) {
//     const opts = { bufferCommands: false }
//     cached.promise = mongoose.connect(uri, opts).then((mongoose) => mongoose)
//   }

//   try {
//     cached.conn = await cached.promise
//   } catch (e) {
//     cached.promise = null
//     throw e
//   }

//   return cached.conn
// }

// // const options = { appName: "devrel.template.nextjs" };
// // const options = {};

// // let client: MongoClient;

// // if (process.env.NODE_ENV === "development") {
// //   // In development mode, use a global variable so that the value
// //   // is preserved across module reloads caused by HMR (Hot Module Replacement).
// //   let globalWithMongo = global as typeof globalThis & {
// //     _mongoClient?: MongoClient;
// //   };

// //   if (!globalWithMongo._mongoClient) {
// //     globalWithMongo._mongoClient = new MongoClient(uri, options);
// //   }
// //   client = globalWithMongo._mongoClient;
// // } else {
// //   // In production mode, it's best to not use a global variable.
// //   client = new MongoClient(uri, options);
// // }

// // // Export a module-scoped MongoClient. By doing this in a
// // // separate module, the client can be shared across functions.

// // export default client;
