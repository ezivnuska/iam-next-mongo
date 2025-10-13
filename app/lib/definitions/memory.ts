// app/lib/definitions/memory.ts

import { PartialUser } from "./user";
import type { Image } from "./image"
import type { Types, Document } from 'mongoose'

export interface IMemory extends Document {
  author: Types.ObjectId
  date: Date
  title?: string
  content: string
  shared: boolean
  image?: Types.ObjectId
  likes?: Types.ObjectId[]
}

export interface Memory {
  id: string
  date: string
  title?: string
  content: string
  shared: boolean
  createdAt: string
  updatedAt: string
  author: PartialUser
  image?: Image
}
