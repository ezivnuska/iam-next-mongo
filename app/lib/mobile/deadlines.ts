// app/lib/mobile/deadlines.ts

/** Returns the midnight that ends the calendar day following `from`.
 *  e.g. accepted any time Monday → deadline = Wednesday 00:00:00 (= end of Tuesday) */
export function midnightFollowingDay(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 2)
  d.setHours(0, 0, 0, 0)
  return d
}
