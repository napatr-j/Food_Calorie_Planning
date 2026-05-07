import { createClient } from '@libsql/client'
import path from 'path'
import type { Profile, Food, MealEntry, WeekLogEntry } from './types'

// Absolute path so it works regardless of cwd
const DB_PATH = path.join(process.cwd(), '..', 'database', 'app.db').replace(/\\/g, '/')
const db = createClient({ url: `file:${DB_PATH}` })

// ── helpers ────────────────────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light_exercise: 1.375,
  moderate_exercise: 1.55,
  heavy_exercise: 1.725,
  athlete: 1.9,
}

function calcBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null
  return Math.round((weight / Math.pow(height / 100, 2)) * 100) / 100
}

function calcTDEE(weight: number | null, height: number | null, age: number | null, gender: string | null, activityLevel: string | null): number | null {
  if (!weight || !height || !age || !gender || !activityLevel) return null
  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)
  const mult = ACTIVITY_MULTIPLIERS[activityLevel]
  return mult ? Math.round(bmr * mult * 100) / 100 : null
}

function rowToObj<T>(row: Record<string, unknown>): T {
  return row as T
}

// ── auth ───────────────────────────────────────────────────────────────────

export async function createUser(username: string, passwordHash: string): Promise<number> {
  const r = await db.execute({ sql: 'INSERT INTO users (username, password_hash) VALUES (?, ?)', args: [username, passwordHash] })
  return Number(r.lastInsertRowid)
}

export async function getUserByUsername(username: string) {
  const r = await db.execute({ sql: 'SELECT id, username, password_hash FROM users WHERE username = ?', args: [username] })
  return r.rows[0] as unknown as { id: number; username: string; password_hash: string } | undefined
}

// ── profile ────────────────────────────────────────────────────────────────

export async function getProfile(userId: number): Promise<Profile | null> {
  const r = await db.execute({ sql: 'SELECT * FROM user_profiles WHERE user_id = ?', args: [userId] })
  return r.rows[0] ? rowToObj<Profile>(r.rows[0] as Record<string, unknown>) : null
}

export async function createProfile(userId: number): Promise<void> {
  await db.execute({ sql: 'INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)', args: [userId] })
}

export async function updateProfile(userId: number, fields: Record<string, unknown>): Promise<Profile> {
  const ALLOWED = new Set(['display_name','height_cm','weight_kg','body_fat_pct','age','gender','activity_level','ideal_cal'])
  const updates = Object.fromEntries(Object.entries(fields).filter(([k]) => ALLOWED.has(k)))

  const existingRes = await db.execute({ sql: 'SELECT * FROM user_profiles WHERE user_id = ?', args: [userId] })
  const existing = existingRes.rows[0] as Record<string, unknown> | undefined
  const merged = { ...(existing ?? { user_id: userId }), ...updates }

  const bmi = calcBMI(merged.weight_kg as number | null, merged.height_cm as number | null)
  const tdee = calcTDEE(merged.weight_kg as number | null, merged.height_cm as number | null, merged.age as number | null, merged.gender as string | null, merged.activity_level as string | null)

  if (!existing) {
    const payload: Record<string, unknown> = { user_id: userId, ...updates, bmi, tdee }
    const cols = Object.keys(payload).join(', ')
    const placeholders = Object.keys(payload).map(() => '?').join(', ')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.execute({ sql: `INSERT INTO user_profiles (${cols}) VALUES (${placeholders})`, args: Object.values(payload) as any })
  } else {
    const toSet = { ...updates, bmi, tdee }
    const setClause = Object.keys(toSet).map(k => `${k} = ?`).join(', ') + ', updated_at = CURRENT_TIMESTAMP'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.execute({ sql: `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`, args: [...Object.values(toSet), userId] as any })
  }

  const res = await db.execute({ sql: 'SELECT * FROM user_profiles WHERE user_id = ?', args: [userId] })
  return rowToObj<Profile>(res.rows[0] as Record<string, unknown>)
}

// ── food log ───────────────────────────────────────────────────────────────

export async function addFoodLog(params: {
  userId: number; foodName: string; confidence: number
  kcal: number; proteinG: number; fatG: number; carbsG: number; sugarG: number; imagePath: string
}): Promise<number> {
  const r = await db.execute({
    sql: `INSERT INTO food_log (user_id, food_name, confidence, kcal, protein_g, fat_g, carbs_g, sugar_g, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [params.userId, params.foodName, params.confidence, params.kcal, params.proteinG, params.fatG, params.carbsG, params.sugarG, params.imagePath],
  })
  return Number(r.lastInsertRowid)
}

export async function getTodayLog(userId: number): Promise<MealEntry[]> {
  const r = await db.execute({
    sql: `SELECT fl.id, fl.food_name, f.thai_name, f.display_name,
                 fl.kcal, fl.protein_g, fl.fat_g, fl.carbs_g, fl.sugar_g,
                 fl.confidence, fl.image_path, fl.logged_at
          FROM food_log fl
          LEFT JOIN foods f ON fl.food_name = f.name
          WHERE fl.user_id = ? AND fl.log_date = DATE('now')
          ORDER BY fl.logged_at ASC`,
    args: [userId],
  })
  return r.rows as unknown as MealEntry[]
}

export async function getTodayTotalKcal(userId: number): Promise<number> {
  const r = await db.execute({
    sql: "SELECT COALESCE(SUM(kcal), 0) as total FROM food_log WHERE user_id = ? AND log_date = DATE('now')",
    args: [userId],
  })
  return Number(r.rows[0]?.total ?? 0)
}

export async function deleteLogEntry(logId: number, userId: number): Promise<boolean> {
  const r = await db.execute({ sql: 'DELETE FROM food_log WHERE id = ? AND user_id = ?', args: [logId, userId] })
  return (r.rowsAffected ?? 0) > 0
}

export async function getDailyGoal(userId: number): Promise<number> {
  const r = await db.execute({ sql: 'SELECT COALESCE(ideal_cal, tdee) as goal FROM user_profiles WHERE user_id = ?', args: [userId] })
  return Number(r.rows[0]?.goal ?? 2000)
}

export async function getRemainingCalories(userId: number): Promise<number> {
  const [goal, consumed] = await Promise.all([getDailyGoal(userId), getTodayTotalKcal(userId)])
  return Math.round((goal - consumed) * 100) / 100
}

export async function getWeekLog(userId: number): Promise<WeekLogEntry[]> {
  const r = await db.execute({
    sql: `SELECT fl.id, fl.food_name, f.thai_name, f.display_name,
                 fl.kcal, fl.protein_g, fl.fat_g, fl.carbs_g, fl.sugar_g,
                 fl.confidence, fl.image_path, fl.logged_at, fl.log_date
          FROM food_log fl
          LEFT JOIN foods f ON fl.food_name = f.name
          WHERE fl.user_id = ? AND fl.log_date >= DATE('now', '-6 days')
          ORDER BY fl.log_date DESC, fl.logged_at DESC`,
    args: [Number(userId)],
  })
  return r.rows as unknown as WeekLogEntry[]
}

// ── foods library ──────────────────────────────────────────────────────────

const SORT_MAP: Record<string, string> = {
  name: 'name ASC', thai_name: 'thai_name ASC',
  kcal: 'kcal ASC', kcal_asc: 'kcal ASC', kcal_desc: 'kcal DESC',
}

export async function getAllFoods(sortBy = 'name', search = ''): Promise<Food[]> {
  const order = SORT_MAP[sortBy] ?? 'name ASC'
  const like = `%${search}%`
  const r = await db.execute({
    sql: `SELECT name, display_name, thai_name, kcal, protein_g, fat_g, carbs_g, sugar_g, image_path
          FROM foods WHERE name LIKE ? OR thai_name LIKE ? OR display_name LIKE ? ORDER BY ${order}`,
    args: [like, like, like],
  })
  return r.rows as unknown as Food[]
}

export async function getFoodByName(name: string): Promise<Food | null> {
  const r = await db.execute({ sql: 'SELECT * FROM foods WHERE name = ?', args: [name] })
  return r.rows[0] ? (r.rows[0] as unknown as Food) : null
}
