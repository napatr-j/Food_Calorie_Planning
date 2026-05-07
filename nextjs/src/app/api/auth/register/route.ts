import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByUsername, createProfile, updateProfile } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password, profile } = await req.json()

    if (!username || !/^[a-zA-Z0-9ก-๙]{3,30}$/.test(username))
      return NextResponse.json({ error: 'Username must be 3–30 letters/digits, no spaces' }, { status: 400 })
    if (!password || password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    if (await getUserByUsername(username))
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })

    const userId = await createUser(username, await hashPassword(password))
    await createProfile(userId)

    if (profile && typeof profile === 'object') {
      const ALLOWED = ['display_name','gender','height_cm','weight_kg','body_fat_pct','age','activity_level']
      const fields = Object.fromEntries(Object.entries(profile).filter(([k]) => ALLOWED.includes(k)))
      if (Object.keys(fields).length > 0) await updateProfile(userId, fields)
    }

    const token = await signToken({ userId, username })
    const res = NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 })
    return res
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
