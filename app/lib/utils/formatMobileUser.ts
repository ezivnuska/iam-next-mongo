function avatarUrl(username: string, filename: string): string {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${username}/${filename}`
}

export function formatAvatarForMobile(
  avatar: any,
  username: string
): { id: string; variants: { url: string; width: number; height: number; size: string }[] } | null {
  if (!avatar || typeof avatar !== 'object' || !('_id' in avatar)) return null
  return {
    id: avatar._id.toString(),
    variants: (avatar.variants ?? []).map((v: any) => ({
      url: v.url || avatarUrl(username, v.filename),
      width: v.width,
      height: v.height,
      size: v.size,
    })),
  }
}

export function formatUserForMobile(user: any) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    bio: user.bio ?? '',
    avatar: formatAvatarForMobile(user.avatar, user.username),
  }
}
