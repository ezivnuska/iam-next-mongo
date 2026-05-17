// app/lib/mobile/generateTitle.ts
// Generates a "Street & Cross-Street" title from coordinates using OSM APIs.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
const OVERPASS_URL  = 'https://overpass-api.de/api/interpreter'
const USER_AGENT    = 'iameric-app/1.0'

async function getPrimaryRoad(lat: number, lon: number): Promise<string | null> {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  const data = await res.json()
  return (
    data.address?.road        ??
    data.address?.pedestrian  ??
    data.address?.path        ??
    null
  )
}

async function getCrossStreet(lat: number, lon: number, exclude: string): Promise<string | null> {
  const query =
    `[out:json][timeout:8];` +
    `way(around:60,${lat},${lon})` +
    `[highway~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"]` +
    `[name];out tags;`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null

  const data = await res.json()
  const names: string[] = data.elements
    .map((e: any) => e.tags?.name as string | undefined)
    .filter((n: string | undefined): n is string => !!n && n !== exclude)

  return names[0] ?? null
}

export async function generateIssueTitle(lat: number, lon: number): Promise<string | null> {
  try {
    const primary = await getPrimaryRoad(lat, lon)
    if (!primary) return null
    const cross = await getCrossStreet(lat, lon, primary)
    return cross ? `${primary} & ${cross}` : primary
  } catch {
    return null
  }
}
