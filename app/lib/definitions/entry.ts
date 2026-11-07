// app/lib/definitions/entry.ts

import type { PartialUser } from './user'
import type { Image } from './image'
import type { Types, Document } from 'mongoose'

export interface IEntry extends Document {
  author: Types.ObjectId
  contentType: 'memory' | 'post'
  content?: string
  image?: Types.ObjectId
  likes?: Types.ObjectId[]
  // memory-only
  date?: Date
  title?: string
  shared?: boolean
  // post-only
  linkUrl?: string
  linkPreview?: {
    title?: string
    description?: string
    image?: string
    siteName?: string
  }
}

export interface Entry {
  id: string
  contentType: 'memory' | 'post'
  author: PartialUser
  content?: string
  image?: Image
  likes?: string[]
  likedByCurrentUser?: boolean
  commentCount?: number
  createdAt: string
  updatedAt: string
  // memory-only
  date?: string
  title?: string
  shared?: boolean
  // post-only
  linkUrl?: string
  linkPreview?: {
    title?: string
    description?: string
    image?: string
  }
}
