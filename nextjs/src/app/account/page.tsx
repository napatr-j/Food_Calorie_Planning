'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { CalorieBar, RemainingBar } from '@/components/calorie-bar'
import { bmiCategory, ACTIVITY_LABELS, calcTDEE, imageUrl as resolveImageUrl } from '@/lib/utils'
import type { Profile, WeekLogEntry } from '@/lib/types'
import {
  Pencil, Save, X, Trash2, Upload, User, Scale, Ruler, Activity,
  AlertCircle, Calendar, UtensilsCrossed, Beef, Droplets, Wheat, Candy,
} from 'lucide-react'

const ACTIVITY_KEYS = Object.keys(ACTIVITY_LABELS)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-border-col last:border-0">
      <span className="text-xs text-gray-mid">{label}</span>
      <span className="text-xs font-semibold text-primary">{value || '—'}</span>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Profile Sidebar ──────────────────────────────────────────────────────────

function ProfileSidebar({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const [form, setForm] = useState({
    display_name:   profile.display_name ?? '',
    gender:         profile.gender ?? 'male',
    age:            profile.age ?? 25,
    height_cm:      profile.height_cm ?? 165,
    weight_kg:      profile.weight_kg ?? 60,
    body_fat_pct:   profile.body_fat_pct ?? 20,
    activity_level: profile.activity_level ?? 'sedentary',
    ideal_cal:      profile.ideal_cal ?? null as number | null,
    use_tdee:       profile.ideal_cal == null,
  })

  useEffect(() => {
    setForm({
      display_name:   profile.display_name ?? '',
      gender:         profile.gender ?? 'male',
      age:            profile.age ?? 25,
      height_cm:      profile.height_cm ?? 165,
      weight_kg:      profile.weight_kg ?? 60,
      body_fat_pct:   profile.body_fat_pct ?? 20,
      activity_level: profile.activity_level ?? 'sedentary',
      ideal_cal:      profile.ideal_cal ?? null,
      use_tdee:       profile.ideal_cal == null,
    })
  }, [profile])

  function field(k: string, v: string | number) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const liveTDEE = calcTDEE(form.weight_kg, form.height_cm, form.age, form.gender, form.activity_level)

  async function save() {
    setSaving(true)
    setServerErr('')
    const payload = {
      display_name:   form.display_name || null,
      gender:         form.gender,
      age:            Number(form.age),
      height_cm:      Number(form.height_cm),
      weight_kg:      Number(form.weight_kg),
      body_fat_pct:   Number(form.body_fat_pct),
      activity_level: form.activity_level,
      ideal_cal:      form.use_tdee ? null : Number(form.ideal_cal),
    }
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); onSaved() }
    else { const d = await res.json(); setServerErr(d.error ?? 'Save failed') }
  }

  const bmi = profile.bmi
  const goal = profile.ideal_cal ? `${profile.ideal_cal.toFixed(0)} kcal` : 'Use TDEE automatically'

  if (editing) {
    return (
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
            <Pencil size={14} /> Edit Profile
          </h3>
          <button onClick={() => setEditing(false)} className="text-gray-mid hover:text-primary p-1 rounded">
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="label">Display Name</label>
          <input className="input-field" value={form.display_name} onChange={e => field('display_name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Gender</label>
            <select className="input-field" value={form.gender} onChange={e => field('gender', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label">Age</label>
            <input className="input-field" type="number" min={5} max={120} value={form.age} onChange={e => field('age', +e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Height (cm)</label>
            <input className="input-field" type="number" min={50} max={300} step={0.1} value={form.height_cm} onChange={e => field('height_cm', +e.target.value)} />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input className="input-field" type="number" min={10} max={500} step={0.1} value={form.weight_kg} onChange={e => field('weight_kg', +e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Body Fat (%)</label>
          <input className="input-field" type="number" min={1} max={70} step={0.1} value={form.body_fat_pct} onChange={e => field('body_fat_pct', +e.target.value)} />
        </div>
        <div>
          <label className="label">Activity Level</label>
          <select className="input-field" value={form.activity_level} onChange={e => field('activity_level', e.target.value)}>
            {ACTIVITY_KEYS.map(k => <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>)}
          </select>
        </div>

        {/* Live TDEE preview */}
        {liveTDEE && (
          <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-border-col/40">
            <span className="text-xs text-gray-dark font-medium">Estimated TDEE</span>
            <span className="text-sm font-extrabold text-primary">{liveTDEE} kcal/day</span>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.use_tdee}
              onChange={e => setForm(f => ({ ...f, use_tdee: e.target.checked }))}
            />
            Use TDEE automatically (no manual calorie goal)
          </label>
          {!form.use_tdee && (
            <div className="mt-2">
              <label className="label">Daily Calorie Goal (kcal)</label>
              <input
                className="input-field"
                type="number"
                min={500}
                max={10000}
                step={50}
                value={form.ideal_cal ?? 2000}
                onChange={e => setForm(f => ({ ...f, ideal_cal: +e.target.value }))}
              />
            </div>
          )}
        </div>

        {serverErr && (
          <div className="flex items-center gap-2 text-danger text-xs">
            <AlertCircle size={13} /> {serverErr}
          </div>
        )}

        <button
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          onClick={save}
          disabled={saving}
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-col">
        <div className="w-12 h-12 bg-bg rounded-full flex items-center justify-center flex-shrink-0 border border-border-col/40">
          <User size={22} className="text-gray-mid" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-primary truncate">{profile.display_name || 'No display name'}</p>
          <p className="text-xs text-gray-mid mt-0.5">
            {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : ''}
            {profile.age ? `, ${profile.age} yrs` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { icon: <Scale size={13} />,    label: 'Weight', val: profile.weight_kg ? `${profile.weight_kg} kg`          : '—' },
          { icon: <Ruler size={13} />,    label: 'Height', val: profile.height_cm ? `${profile.height_cm} cm`          : '—' },
          { icon: <Activity size={13} />, label: 'BMI',    val: bmi ? `${bmi.toFixed(1)} (${bmiCategory(bmi)})`         : '—' },
          { icon: <Activity size={13} />, label: 'TDEE',   val: profile.tdee ? `${profile.tdee.toFixed(0)} kcal`        : '—' },
        ].map(s => (
          <div key={s.label} className="bg-bg rounded-xl p-3 border border-border-col/40">
            <div className="flex items-center gap-1 text-gray-mid mb-1">
              {s.icon}
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-sm font-bold text-primary leading-tight">{s.val}</p>
          </div>
        ))}
      </div>

      <InfoRow label="Activity Level" value={ACTIVITY_LABELS[profile.activity_level ?? ''] ?? null} />
      <InfoRow label="Body Fat"       value={profile.body_fat_pct ? `${profile.body_fat_pct}%` : null} />
      <InfoRow label="Daily Goal"     value={goal} />

      <button
        className="mt-4 w-full btn-ghost flex items-center justify-center gap-2 text-sm"
        onClick={() => setEditing(true)}
      >
        <Pencil size={14} /> Edit Profile
      </button>
    </div>
  )
}

// ─── 7-Day Food Log ───────────────────────────────────────────────────────────

interface DailyGroup {
  date: string
  entries: WeekLogEntry[]
  totalKcal: number
}

function WeekLog({ dailyGoal }: { dailyGoal: number }) {
  const router = useRouter()
  const [groups, setGroups] = useState<DailyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchLog = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/log/history')
    if (res.ok) {
      const raw: WeekLogEntry[] = await res.json()
      const map = new Map<string, WeekLogEntry[]>()
      for (const e of raw) {
        if (!map.has(e.log_date)) map.set(e.log_date, [])
        map.get(e.log_date)!.push({ ...e, image_url: resolveImageUrl(e.image_path) })
      }
      setGroups(Array.from(map.entries()).map(([date, es]) => ({
        date,
        entries: es,
        totalKcal: es.reduce((s, e) => s + (e.kcal || 0), 0),
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLog() }, [fetchLog])

  async function deleteEntry(id: number) {
    const res = await fetch(`/api/log/${id}`, { method: 'DELETE' })
    if (res.ok) { setDeletingId(null); fetchLog() }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <div key={i} className="skeleton h-40" />)}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="card p-10 text-center">
        <UtensilsCrossed size={36} className="mx-auto mb-3 text-border-col" />
        <p className="font-medium text-gray-dark">No meals logged in the past 7 days</p>
        <button
          className="btn-primary flex items-center gap-2 mx-auto mt-4"
          onClick={() => router.push('/upload')}
        >
          <Upload size={15} /> Upload food photo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.date}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-gray-mid" />
              <h3 className="font-bold text-sm text-primary">{formatDate(group.date)}</h3>
              <span className="text-xs text-gray-mid">{group.date}</span>
            </div>
            <span className="text-xs font-semibold text-gray-dark bg-bg border border-border-col/40 px-2.5 py-1 rounded-full">
              {group.totalKcal.toFixed(0)} kcal
            </span>
          </div>

          <div className="mb-3">
            <CalorieBar current={group.totalKcal} total={dailyGoal} showText />
          </div>

          <div className="space-y-3">
            {group.entries.map(meal => (
              <div key={meal.id} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-light">
                    {meal.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meal.image_url} alt={meal.food_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed size={20} className="text-gray-mid" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary leading-tight truncate">
                      {meal.display_name || meal.food_name}
                    </p>
                    {meal.thai_name && <p className="text-xs text-gray-mid">{meal.thai_name}</p>}
                    <p className="text-xs text-gray-mid mt-0.5">
                      {meal.logged_at.slice(11, 16)} &nbsp;·&nbsp; {(meal.confidence * 100).toFixed(0)}% confidence
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      <span className="text-xs font-bold text-primary">{meal.kcal?.toFixed(0)} kcal</span>
                      <span className="text-xs text-gray-mid flex items-center gap-0.5"><Beef size={10} />{meal.protein_g?.toFixed(0)}g</span>
                      <span className="text-xs text-gray-mid flex items-center gap-0.5"><Droplets size={10} />{meal.fat_g?.toFixed(0)}g</span>
                      <span className="text-xs text-gray-mid flex items-center gap-0.5"><Wheat size={10} />{meal.carbs_g?.toFixed(0)}g</span>
                      <span className="text-xs text-gray-mid flex items-center gap-0.5"><Candy size={10} />{meal.sugar_g?.toFixed(0)}g</span>
                    </div>
                  </div>
                </div>

                {deletingId === meal.id ? (
                  <div className="mt-3 p-3 bg-bg rounded-xl border border-border-col">
                    <p className="text-xs font-medium text-primary mb-2">Delete this entry?</p>
                    <div className="flex gap-2">
                      <button className="btn-danger text-xs py-1.5 px-3" onClick={() => deleteEntry(meal.id)}>Confirm Delete</button>
                      <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => setDeletingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="mt-2 flex items-center gap-1 text-xs text-gray-mid hover:text-danger transition-colors"
                    onClick={() => setDeletingId(meal.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayRemaining, setTodayRemaining] = useState<{ remaining: number; goal: number } | null>(null)

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/profile')
    if (res.ok) setProfile(await res.json())
    setLoading(false)
  }, [])

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/log')
    if (res.ok) {
      const d = await res.json()
      setTodayRemaining({ remaining: d.remaining_cal, goal: d.daily_goal })
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchToday()
  }, [fetchProfile, fetchToday])

  return (
    <>
      <Navbar />
      <main className="page-fade max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-primary mb-6 flex items-center gap-2">
          <User size={22} />
          My Account
        </h1>

        {loading ? (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            <div className="skeleton h-80" />
            <div className="space-y-4">
              <div className="skeleton h-16" />
              <div className="skeleton h-40" />
            </div>
          </div>
        ) : !profile ? (
          <p className="text-danger flex items-center gap-2">
            <AlertCircle size={16} /> Unable to load profile data.
          </p>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Profile sidebar */}
            <div className="lg:sticky lg:top-20">
              <ProfileSidebar profile={profile} onSaved={fetchProfile} />
            </div>

            {/* Food log main content */}
            <div>
              {todayRemaining && (
                <RemainingBar remaining={todayRemaining.remaining} dailyGoal={todayRemaining.goal} />
              )}

              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-gray-dark" />
                <h2 className="font-bold text-primary">Food Log — Past 7 Days</h2>
              </div>

              <WeekLog dailyGoal={profile.tdee || profile.ideal_cal || 2000} />
            </div>
          </div>
        )}
      </main>
    </>
  )
}
