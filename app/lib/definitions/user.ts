//app/lib/definitions/user.ts

// Wire-format types live in @iam/shared-types — re-export them so existing
// imports of '@/app/lib/definitions/user' continue to work unchanged.
export {
  UserRole,
  type AppUser,
  type User,
  type PartialUser,
  type Author,
  type AuthResponseType,
  type RefreshTokenResponse,
} from '@iam/shared-types'

// DB-level document lives in @iam/db — re-export for server-side callers.
export type { UserDocument } from '@iam/db'
