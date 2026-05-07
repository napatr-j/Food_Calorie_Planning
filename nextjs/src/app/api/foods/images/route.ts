import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest) {
  const foodClass = req.nextUrl.searchParams.get('class') ?? ''
  // Sanitize: only allow alphanumeric, underscores, hyphens
  const safeClass = foodClass.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeClass) return NextResponse.json([])

  const baseDir = path.join(process.cwd(), '..', 'data', 'train')
  const dir = path.join(baseDir, safeClass)

  // Prevent path traversal
  if (!dir.startsWith(baseDir)) return NextResponse.json([])
  if (!fs.existsSync(dir)) return NextResponse.json([])

  try {
    const files = fs.readdirSync(dir)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .sort()
      .slice(0, 3)
      .map(f => `/api/images/${safeClass}/${f}`)
    return NextResponse.json(files)
  } catch {
    return NextResponse.json([])
  }
}
