import { createHmac, timingSafeEqual } from 'crypto'

function b64url(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8')
  return buf.toString('base64url')
}

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET is not set')
  return s
}

export function signMobileToken(userId: string): string {
  const secret = getSecret()
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30  // 30 days
  const payload = b64url(JSON.stringify({ sub: userId, iat: Math.floor(Date.now() / 1000), exp }))
  const sig = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${sig}`
}

export function verifyMobileToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, sig] = parts
    const secret = getSecret()
    const expected = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest())

    const a = Buffer.from(sig, 'base64url')
    const b = Buffer.from(expected, 'base64url')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.exp && Date.now() / 1000 > data.exp) return null
    return data.sub ?? null
  } catch {
    return null
  }
}

export function getMobileUserId(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyMobileToken(auth.slice(7))
}
