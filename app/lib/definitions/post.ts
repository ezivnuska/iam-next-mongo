// app/lib/definitions/post.ts

import { PartialUser } from "./user";
import type { Image } from "./image"
import type { Types, Document } from 'mongoose'

export interface IPost extends Document {
  author: Types.ObjectId
  content?: string
  image?: Types.ObjectId
  linkUrl?: string
  linkPreview?: {
    title?: string
    description?: string
    image?: string
    siteName?: string
  }
  likes?: Types.ObjectId[]
}

export interface Post {
  id: string
  content?: string
  createdAt: string
  updatedAt: string
  author: PartialUser
  image?: Image
  linkUrl?: string
  linkPreview?: {
    title?: string
    description?: string
    image?: string
  }
  likes?: string[]
  likedByCurrentUser?: boolean
  commentCount?: number
}
