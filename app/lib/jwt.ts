// app/lib/jwt.ts
// Centralized JWT helpers — single place for all secret access and token ops.
// Imported by server.ts, api/middleware/auth.ts, api/routes/mobile/auth.ts,
// and app/api/auth/games-token/route.ts.

import { SignJWT, jwtVerify } from 'jose'

function requireSecret(value: string | undefined, name: string): Uint8Array {
  if (!value) throw new Error(`${name} is not set`)
  return new TextEncoder().encode(value)
}

// ---- Mobile / NextAuth JWT (NEXTAUTH_SECRET) ----

export function getMobileSecret(): Uint8Array {
  return requireSecret(process.env.NEXTAUTH_SECRET, 'NEXTAUTH_SECRET')
}

export async function signMobileToken(
  payload: Record<string, unknown>,
  expiry = '7d'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiry)
    .sign(getMobileSecret())
}

export async function verifyMobileToken(token: string) {
  const { payload } = await jwtVerify(token, getMobileSecret())
  return payload
}

// ---- Games SSO JWT (GAMES_TOKEN_SECRET) ----

export function getGamesSecret(): Uint8Array {
  return requireSecret(process.env.GAMES_TOKEN_SECRET, 'GAMES_TOKEN_SECRET')
}

export async function signGamesToken(
  payload: Record<string, unknown>,
  expiry = '5m'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getGamesSecret())
}
