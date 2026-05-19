// app/lib/utils/ratingUtils.ts

/** Average of all rating scores, rounded to one decimal place. Returns null for empty input. */
export function calculateAverageRating(ratings: { score: number | null }[]): number | null {
  const scored = ratings.filter((r) => r.score !== null)
  if (scored.length === 0) return null
  return Math.round((scored.reduce((s, r) => s + r.score!, 0) / scored.length) * 10) / 10
}
