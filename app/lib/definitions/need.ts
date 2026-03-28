// app/lib/definitions/need.ts

import { PartialUser } from './user'
import type { Image } from './image'
import type { Types, Document } from 'mongoose'

export interface INeed extends Document {
  author: Types.ObjectId
  title?: string
  content: string
  shared: boolean
  image?: Types.ObjectId
  likes?: Types.ObjectId[]
}

export interface Need {
  id: string
  title?: string
  content: string
  shared: boolean
  createdAt: string
  updatedAt: string
  author: PartialUser
  image?: Image
  likes?: string[]
  likedByCurrentUser?: boolean
  commentCount?: number
}
