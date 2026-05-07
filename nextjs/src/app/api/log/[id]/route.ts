import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteLogEntry } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const logId = parseInt(params.id, 10)
  if (isNaN(logId)) return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 })
  const deleted = await deleteLogEntry(logId, session.userId)
  if (!deleted) return NextResponse.json({ error: 'Entry not found or access denied' }, { status: 404 })
  return NextResponse.json({ message: 'Deleted' })
}
