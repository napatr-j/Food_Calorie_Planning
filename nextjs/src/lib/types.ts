export interface Profile {
  id: number
  user_id: number
  display_name: string | null
  height_cm: number | null
  weight_kg: number | null
  body_fat_pct: number | null
  age: number | null
  gender: 'male' | 'female' | null
  activity_level: string | null
  ideal_cal: number | null
  bmi: number | null
  tdee: number | null
  updated_at: string
}

export interface Food {
  name: string
  display_name: string
  thai_name: string
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  sugar_g: number
  image_path: string | null
  image_url: string | null
}

export interface MealEntry {
  id: number
  food_name: string
  thai_name: string | null
  display_name: string | null
  confidence: number
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  sugar_g: number
  image_path: string | null
  image_url: string | null
  logged_at: string
}

export interface WeekLogEntry extends MealEntry {
  log_date: string
}

export interface TodayLog {
  meals: MealEntry[]
  total_kcal: number
  daily_goal: number
  remaining_cal: number
}

export interface Session {
  userId: number
  username: string
}

export interface ClassifyResult {
  log_id: number
  label: string
  thai_name: string
  display_name: string
  confidence: number
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  sugar_g: number
  top5: Array<{ label: string; confidence: number }>
  image_url: string
  remaining_cal: number
  daily_goal: number
}
