import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWeekLog } from '@/lib/db'
import { imageUrl } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const entries = await getWeekLog(session.userId)
  return NextResponse.json(entries.map(m => ({ ...m, image_url: imageUrl(m.image_path) })))
}
