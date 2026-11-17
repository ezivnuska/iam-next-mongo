import type { User, Image, Message, MessageParticipant, ApiAvatar } from '@iam/shared-types'
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

function normalizeMessageParticipant(user: any): MessageParticipant {
  const avatar: ApiAvatar | null =
    user?.avatar && typeof user.avatar === 'object' && '_id' in user.avatar
      ? { id: user.avatar._id.toString(), variants: user.avatar.variants ?? [] }
      : null
  return {
    id: user?._id?.toString() ?? user?.id ?? '',
    username: user?.username ?? '',
    avatar,
  }
}

export function normalizeMessage(doc: any): Message {
  return {
    id: doc._id.toString(),
    threadId: doc.threadId,
    from: normalizeMessageParticipant(doc.from),
    to: normalizeMessageParticipant(doc.to),
    text: doc.text,
    readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
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
