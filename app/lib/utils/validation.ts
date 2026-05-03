// app/lib/utils/validation.ts

export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id)
}

export const USER_WITH_AVATAR_POPULATE = {
  path: 'userId',
  select: '_id username avatar',
  populate: { path: 'avatar', select: '_id variants' },
} as const
