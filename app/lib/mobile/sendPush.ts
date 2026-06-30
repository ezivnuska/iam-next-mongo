// app/lib/mobile/sendPush.ts
// Fire-and-forget push notification helper. Always call with .catch() at the
// call site — failures should never block a response.

import UserModel from '../models/user'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (!unique.length) return

  const users = await UserModel.find(
    { _id: { $in: unique }, expoPushToken: { $exists: true } },
    { expoPushToken: 1 },
  ).lean() as any[]

  const messages = users
    .map((u: any) => u.expoPushToken as string | undefined)
    .filter((t): t is string => !!t)
    .map((to) => ({ to, title, body, sound: 'default', ...(data ? { data } : {}) }))

  if (!messages.length) return

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  })
}
