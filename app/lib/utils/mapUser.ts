// app/lib/utils/mapUser.ts

import type { UserDocument, AppUser } from "../definitions/user";
import type { ImageDocument, Image } from "../definitions/image";

export function mapUserDocumentToAppUser(user: UserDocument): AppUser {
  let avatar: Image | undefined;

  if (user.avatar && typeof user.avatar !== "string" && "_id" in user.avatar) {
    const a = user.avatar as ImageDocument & { url?: string };
    avatar = {
      id: a._id.toString(),
      userId: a.userId.toString(),
      username: a.username,
      alt: a.alt ?? "",
      variants: a.variants.map((v) => ({
        size: v.size,
        filename: v.filename,
        width: v.width,
        height: v.height,
        url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${a.username}/${v.filename}`,
      })),
      likes: (a.likes ?? []).map((l) => l.toString()),
      likedByCurrentUser: false,
      createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    bio: user.bio,
    verified: user.verified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    avatar,
    emailVerified: null,
  } as AppUser;
}
