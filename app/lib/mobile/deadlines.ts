// app/lib/mobile/deadlines.ts

export function midnightFollowingDay(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}
