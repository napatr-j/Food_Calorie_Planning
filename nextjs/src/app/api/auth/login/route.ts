import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const user = await getUserByUsername(username)
    if (!user || !(await verifyPassword(password, user.password_hash)))
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 })

    const token = await signToken({ userId: user.id, username: user.username })
    const res = NextResponse.json({ message: 'Signed in', username: user.username, userId: user.id })
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 })
    return res
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
