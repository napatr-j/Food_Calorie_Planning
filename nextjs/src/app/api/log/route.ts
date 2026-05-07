import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTodayLog, getTodayTotalKcal, getDailyGoal, getRemainingCalories } from '@/lib/db'
import { imageUrl } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [meals, total, goal, remaining] = await Promise.all([
    getTodayLog(session.userId),
    getTodayTotalKcal(session.userId),
    getDailyGoal(session.userId),
    getRemainingCalories(session.userId),
  ])

  return NextResponse.json({
    meals: meals.map(m => ({ ...m, image_url: imageUrl(m.image_path) })),
    total_kcal: total,
    daily_goal: goal,
    remaining_cal: remaining,
  })
}
