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

// DB-level document lives in @iam/db — re-export for server-side callers.
export type { ImageDocument } from '@iam/db'
