// app/lib/mobile/deadlines.ts

/** Returns midnight that ends the calendar day following `from`.
 *  e.g. accepted Monday any time → deadline = Tuesday 00:00:00 Wednesday */
export function midnightFollowingDay(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 2)
  d.setHours(0, 0, 0, 0)
  return d
}
