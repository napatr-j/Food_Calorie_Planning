import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function bmiCategory(bmi: number | null): string {
  if (!bmi) return ''
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 23) return 'Normal'
  if (bmi < 25) return 'Overweight'
  return 'Obese'
}

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:         'Sedentary (little or no exercise)',
  light_exercise:    'Light exercise (1–3 days/week)',
  moderate_exercise: 'Moderate exercise (3–5 days/week)',
  heavy_exercise:    'Heavy exercise (6–7 days/week)',
  athlete:           'Athlete (very intense daily training)',
}

export function imageUrl(imagePath: string | null, base = ''): string | null {
  if (!imagePath) return null
  const p = imagePath.replace(/\\/g, '/')
  if (p.includes('data/train/')) {
    const rel = p.split('data/train/')[1]
    return `${base}/api/images/${rel}`
  }
  if (p.includes('uploads/')) {
    const rel = p.split('uploads/')[1]
    return `${base}/api/uploads/${rel}`
  }
  return null
}

export function calcTDEE(
  weight: number | null,
  height: number | null,
  age: number | null,
  gender: string | null,
  activityLevel: string | null,
): number | null {
  if (!weight || !height || !age || !gender || !activityLevel) return null
  const MULTIPLIERS: Record<string, number> = {
    sedentary: 1.2, light_exercise: 1.375, moderate_exercise: 1.55,
    heavy_exercise: 1.725, athlete: 1.9,
  }
  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)
  const mult = MULTIPLIERS[activityLevel]
  return mult ? Math.round(bmr * mult) : null
}
