import type { User, Image } from '@iam/shared-types'
import type { UserDocument } from './models/user'

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
        avatar: doc.avatar && typeof doc.avatar === 'object' && 'variants' in doc.avatar
            ? {
                id: doc.avatar._id?.toString(),
                userId: doc.avatar.userId?.toString(),
                username: doc.avatar.username,
                alt: doc.avatar.alt,
                variants: doc.avatar.variants.map((v: any) => ({
                    size: v.size,
                    filename: v.filename,
                    width: v.width,
                    height: v.height,
                    url: v.url,
                })),
              }
            : null,
    }
}

export function normalizeUsers(rawUsers: UserDocument[]): User[] {
    return rawUsers.map(normalizeUser)
}

export function normalizePublicUser(doc: UserDocument) {
    return {
        id: doc._id.toString(),
        username: doc.username,
        bio: doc.bio,
        avatar: doc.avatar && typeof doc.avatar === 'object' && 'variants' in doc.avatar
            ? {
                id: doc.avatar._id?.toString(),
                variants: doc.avatar.variants.map((v: any) => ({
                    size: v.size,
                    filename: v.filename,
                    width: v.width,
                    height: v.height,
                    url: v.url,
                })),
              }
            : null,
    }
}

export function normalizeImage(img?: any): Image | undefined {
    if (!img) return undefined
    return {
        id: img._id?.toString?.() ?? img.id,
        userId: img.userId,
        username: img.username,
        alt: img.alt ?? '',
        variants: img.variants ?? [],
    }
}
