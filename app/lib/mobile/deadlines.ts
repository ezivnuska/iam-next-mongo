// app/lib/mobile/deadlines.ts

/** Returns 2 minutes from `from` — shortened for testing.
 *  Production: d.setDate(d.getDate() + 2); d.setHours(0, 0, 0, 0) */
export function midnightFollowingDay(from: Date = new Date()): Date {
  return new Date(from.getTime() + 2 * 60 * 1000)
}
