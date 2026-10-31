// app/lib/definitions/image.ts

// Wire-format types live in @iam/shared-types — re-export so existing imports work.
export {
  type ImageVariant,
  type Image,
  type UploadedImage,
  type SanitizedImage,
  type SocketImage,
  type GalleryImage,
} from '@iam/shared-types'

import type { Types } from 'mongoose'
import type { ImageVariant } from '@iam/shared-types'

// DB-level document (server only — never sent to clients)
export interface ImageDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  alt?: string;
  variants: ImageVariant[];
  createdAt: string;
  updatedAt: Date;
}
