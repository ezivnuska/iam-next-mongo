// app/lib/definitions/post.ts

import { PartialUser } from "./user";
import type { UploadedImage } from "./image"

export interface Post {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: PartialUser
  image?: UploadedImage
  linkUrl?: string
  linkPreview?: {
    title?: string
    description?: string
    image?: string
  }
}
