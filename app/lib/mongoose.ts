// app/lib/mongoose.ts

import mongoose from 'mongoose';
import '@/app/lib/models/image';
import '@/app/lib/models/user';

export async function connectToDatabase() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGO_URI!);
}