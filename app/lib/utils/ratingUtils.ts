// app/lib/utils/ratingUtils.ts

/** Average of all rating scores, rounded to one decimal place. Returns null for empty input. */
export function calculateAverageRating(ratings: { score: number }[]): number | null {
  if (ratings.length === 0) return null
  return Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
}
