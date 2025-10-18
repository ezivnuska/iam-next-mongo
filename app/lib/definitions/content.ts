// app/lib/definitions/content.ts

import type { Memory as MemoryType } from "@/app/lib/definitions/memory";
import type { Post as PostType } from "@/app/lib/definitions/post";
import type { Image as ImageType } from "@/app/lib/definitions/image";

export type ContentItem =
  | (MemoryType & { contentType: 'memory' })
  | (PostType & { contentType: 'post' })
  | (ImageType & { contentType: 'image' });
