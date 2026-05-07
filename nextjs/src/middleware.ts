import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-key-change-in-production',
)

const PROTECTED = ['/upload', '/account']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!PROTECTED.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('token')
    return res
  }
}

export const config = {
  matcher: ['/upload/:path*', '/account/:path*'],
}
