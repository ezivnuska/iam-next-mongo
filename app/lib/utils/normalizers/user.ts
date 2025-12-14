// app/lib/utils/normalizeUser.ts

import type { User, UserDocument } from '@/app/lib/definitions'

export function normalizeUser(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      username: doc.username,
      email: doc.email,
      role: doc.role,
      bio: doc.bio,
      verified: doc.verified,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      emailVerified: doc.emailVerified ?? null,
      avatar: doc.avatar && typeof doc.avatar === "object" && "variants" in doc.avatar
        ? {
            id: doc.avatar._id?.toString(),
            userId: doc.avatar.userId?.toString(),
            username: doc.avatar.username,
            alt: doc.avatar.alt,
            variants: doc.avatar.variants.map(v => ({
              size: v.size,
              filename: v.filename,
              width: v.width,
              height: v.height,
              url: v.url,
            })),
          }
        : null,
    };
  }

export function normalizeUsers(rawUsers: any[]): User[] {
    return rawUsers.map(normalizeUser)
}
