import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getSession } from '@/lib/auth'
import { addFoodLog, getFoodByName, getDailyGoal, getRemainingCalories } from '@/lib/db'

const AI_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png'])

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTS.has(ext))
    return NextResponse.json({ error: 'Only .jpg, .jpeg, .png files are supported' }, { status: 400 })

  // Forward raw bytes to AI inference service
  const forwardForm = new FormData()
  forwardForm.append('file', file)

  let aiResult: { label: string; confidence: number; top5: { label: string; confidence: number }[] }
  try {
    const aiRes = await fetch(`${AI_URL}/classify`, { method: 'POST', body: forwardForm })
    if (!aiRes.ok) return NextResponse.json({ error: `AI service error: ${await aiRes.text()}` }, { status: 502 })
    aiResult = await aiRes.json()
  } catch {
    return NextResponse.json({ error: 'AI service unreachable. Make sure FastAPI is running on port 8000.' }, { status: 502 })
  }

  const { label, confidence, top5 } = aiResult
  const food = (await getFoodByName(label)) ?? { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sugar_g: 0, thai_name: label, display_name: label }

  // Gate: reject low-confidence predictions before touching the database or filesystem
  if (confidence < 0.6) {
    return NextResponse.json({
      label, confidence, top5,
      thai_name: food.thai_name ?? label,
      display_name: food.display_name ?? label,
      kcal: food.kcal, protein_g: food.protein_g,
      fat_g: food.fat_g, carbs_g: food.carbs_g, sugar_g: food.sugar_g,
    })
  }

  // Persist uploaded image
  const uploadDir = path.join(process.cwd(), '..', 'uploads', String(session.userId))
  fs.mkdirSync(uploadDir, { recursive: true })
  const safeName = `${Date.now()}_${file.name}`
  fs.writeFileSync(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()))

  const relPath = `uploads/${session.userId}/${safeName}`
  const logId = await addFoodLog({
    userId: session.userId, foodName: label, confidence,
    kcal: food.kcal, proteinG: food.protein_g, fatG: food.fat_g,
    carbsG: food.carbs_g, sugarG: food.sugar_g, imagePath: relPath,
  })

  const [remaining, goal] = await Promise.all([
    getRemainingCalories(session.userId),
    getDailyGoal(session.userId),
  ])

  return NextResponse.json({
    log_id: logId, label,
    thai_name: food.thai_name ?? label,
    display_name: food.display_name ?? label,
    confidence, kcal: food.kcal,
    protein_g: food.protein_g, fat_g: food.fat_g,
    carbs_g: food.carbs_g, sugar_g: food.sugar_g,
    top5, image_url: `/api/uploads/${session.userId}/${safeName}`,
    remaining_cal: remaining, daily_goal: goal,
  })
}
