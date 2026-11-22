import type { User, Image, Message, MessageParticipant, ApiAvatar } from '@iam/shared-types'
import type { UserDocument } from './models/user'
import type { MessageDocument } from './models/message'

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
                variants: doc.avatar.variants.map((v) => ({
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
                variants: doc.avatar.variants.map((v) => ({
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

type ParticipantLike = { _id?: unknown; id?: unknown; username?: string; avatar?: unknown }

function normalizeMessageParticipant(user: ParticipantLike): MessageParticipant {
  const avatar: ApiAvatar | null =
    user?.avatar && typeof user.avatar === 'object' && '_id' in (user.avatar as object)
      ? (() => {
          const av = user.avatar as { _id: { toString(): string }; variants?: Array<{ size?: string; filename?: string; width?: number; height?: number; url?: string }> }
          return {
            id: av._id.toString(),
            variants: (av.variants ?? []).map(v => ({
              size: v.size ?? '',
              filename: v.filename ?? '',
              width: v.width ?? 0,
              height: v.height ?? 0,
              url: v.url ?? '',
            })),
          }
        })()
      : null
  return {
    id: (user?._id as { toString(): string } | undefined)?.toString() ?? (user?.id as string | undefined) ?? '',
    username: user?.username ?? '',
    avatar,
  }
}

type MsgLike = { _id: unknown; threadId: unknown; from: unknown; to: unknown; text: unknown; readAt?: unknown; createdAt: unknown; updatedAt: unknown }

export function normalizeMessage(doc: MsgLike): Message {
  return {
    id: (doc._id as { toString(): string }).toString(),
    threadId: doc.threadId as string,
    from: normalizeMessageParticipant(doc.from as ParticipantLike),
    to: normalizeMessageParticipant(doc.to as ParticipantLike),
    text: doc.text as string,
    readAt: doc.readAt ? new Date(doc.readAt as string | number | Date).toISOString() : null,
    createdAt: new Date(doc.createdAt as string | number | Date).toISOString(),
    updatedAt: new Date(doc.updatedAt as string | number | Date).toISOString(),
  }
}

type ImageLike = { _id?: { toString(): string }; id?: string; userId?: string; username?: string; alt?: string; variants?: unknown[] }

export function normalizeImage(img?: ImageLike): Image | undefined {
    if (!img) return undefined
    return {
        id: img._id?.toString() ?? img.id ?? '',
        userId: img.userId ?? '',
        username: img.username ?? '',
        alt: img.alt ?? '',
        variants: (img.variants ?? []) as Image['variants'],
    }
}
