// app/lib/definitions/content.ts

import type { Entry } from '@/app/lib/definitions/entry'
import type { Image as ImageType } from '@/app/lib/definitions/image'

export type ContentItem = Entry | (ImageType & { contentType: 'image' })
