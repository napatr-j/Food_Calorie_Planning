import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getProfile, updateProfile } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getProfile(session.userId)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json(profile)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const ALLOWED = ['display_name','gender','height_cm','weight_kg','body_fat_pct','age','activity_level','ideal_cal']
    const VALID_ACTIVITY = new Set(['sedentary','light_exercise','moderate_exercise','heavy_exercise','athlete'])

    if (body.gender && !['male','female'].includes(body.gender))
      return NextResponse.json({ error: 'Gender must be male or female' }, { status: 400 })
    if (body.activity_level && !VALID_ACTIVITY.has(body.activity_level))
      return NextResponse.json({ error: 'Invalid activity level' }, { status: 400 })
    if (body.height_cm != null && (body.height_cm < 50 || body.height_cm > 300))
      return NextResponse.json({ error: 'Height must be 50–300 cm' }, { status: 400 })
    if (body.weight_kg != null && (body.weight_kg < 10 || body.weight_kg > 500))
      return NextResponse.json({ error: 'Weight must be 10–500 kg' }, { status: 400 })
    if (body.age != null && (body.age < 5 || body.age > 120))
      return NextResponse.json({ error: 'Age must be 5–120' }, { status: 400 })
    if (body.ideal_cal != null && (body.ideal_cal < 500 || body.ideal_cal > 10000))
      return NextResponse.json({ error: 'Calorie goal must be 500–10000' }, { status: 400 })

    const fields = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    const updated = await updateProfile(session.userId, fields)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[profile PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
