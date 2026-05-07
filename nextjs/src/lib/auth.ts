import { SignJWT, jwtVerify } from 'jose'
import bcryptjs from 'bcryptjs'
import { cookies } from 'next/headers'
import type { Session } from './types'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-key-change-in-production',
)

export async function signToken(payload: Session): Promise<string> {
  return new SignJWT({ userId: payload.userId, username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const userId = payload['userId']
    const username = payload['username']
    if (typeof userId !== 'number' || typeof username !== 'string') return null
    return { userId, username }
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(plain, hash)
}
