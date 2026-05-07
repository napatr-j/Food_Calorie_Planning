import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
}

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const rel = params.path.join('/')
  const filePath = path.join(process.cwd(), '..', 'data', 'train', rel)
  if (!filePath.startsWith(path.join(process.cwd(), '..', 'data', 'train'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  if (!fs.existsSync(filePath)) return new NextResponse('Not Found', { status: 404 })

  const ext = path.extname(filePath).toLowerCase()
  const bytes = fs.readFileSync(filePath)
  return new NextResponse(bytes, {
    headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' },
  })
}
