'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { UserPlus, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { ACTIVITY_LABELS, calcTDEE } from '@/lib/utils'

const USERNAME_RE = /^[a-zA-Z0-9ก-๙]{3,30}$/
const ACTIVITY_KEYS = Object.keys(ACTIVITY_LABELS)

interface ProfileForm {
  display_name: string
  gender: 'male' | 'female'
  age: number
  height_cm: number
  weight_kg: number
  body_fat_pct: number
  activity_level: string
}

export default function RegisterPage() {
  const router = useRouter()

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 2 state
  const [profile, setProfile] = useState<ProfileForm>({
    display_name: '',
    gender: 'male',
    age: 25,
    height_cm: 165,
    weight_kg: 65,
    body_fat_pct: 20,
    activity_level: 'sedentary',
  })

  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  // Step 1 validation
  const usernameErr = username && !USERNAME_RE.test(username) ? 'Must be 3–30 characters, letters & digits only' : ''
  const passwordErr = password && password.length < 6 ? 'Must be at least 6 characters' : ''
  const confirmErr  = confirm && confirm !== password ? 'Passwords do not match' : ''
  const step1Valid  = !usernameErr && !passwordErr && !confirmErr && !!username && !!password && !!confirm

  function setField(k: keyof ProfileForm, v: string | number) {
    setProfile(p => ({ ...p, [k]: v }))
  }

  const previewTDEE = calcTDEE(profile.weight_kg, profile.height_cm, profile.age, profile.gender, profile.activity_level)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!step1Valid) return
    setServerError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        profile: {
          display_name:   profile.display_name || null,
          gender:         profile.gender,
          age:            Number(profile.age),
          height_cm:      Number(profile.height_cm),
          weight_kg:      Number(profile.weight_kg),
          body_fat_pct:   Number(profile.body_fat_pct),
          activity_level: profile.activity_level,
        },
      }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/upload')
      router.refresh()
    } else {
      const data = await res.json()
      setServerError(data.error ?? 'Registration failed')
    }
  }

  return (
    <>
      <Navbar />
      <div className="page-fade min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
        <div className="card p-8 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-bg border border-border-col/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserPlus size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Create Account</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-light text-gray-mid'}`}>
              {step > 1 ? <Check size={14} /> : '1'}
            </div>
            <div className={`flex-1 h-0.5 transition-colors ${step > 1 ? 'bg-primary' : 'bg-gray-light'}`} />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-light text-gray-mid'}`}>
              2
            </div>
            <div className="flex-1 text-right">
              <span className="text-xs text-gray-mid">{step === 1 ? 'Credentials' : 'Profile Setup'}</span>
            </div>
          </div>

          {/* ── Step 1: Username + Password ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  className="input-field"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="3–30 characters, letters & digits only"
                  autoComplete="username"
                />
                {usernameErr && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {usernameErr}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    className="input-field pr-10"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-mid hover:text-primary">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErr && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {passwordErr}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <input
                    className="input-field pr-10"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-mid hover:text-primary">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmErr && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {confirmErr}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step 2: Profile Info ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Display Name <span className="text-gray-mid font-normal">(optional)</span></label>
                <input
                  className="input-field"
                  value={profile.display_name}
                  onChange={e => setField('display_name', e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Gender</label>
                  <select className="input-field" value={profile.gender} onChange={e => setField('gender', e.target.value as 'male' | 'female')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="label">Age</label>
                  <input className="input-field" type="number" min={5} max={120} value={profile.age} onChange={e => setField('age', +e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Height (cm)</label>
                  <input className="input-field" type="number" min={50} max={300} step={0.1} value={profile.height_cm} onChange={e => setField('height_cm', +e.target.value)} />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input className="input-field" type="number" min={10} max={500} step={0.1} value={profile.weight_kg} onChange={e => setField('weight_kg', +e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Body Fat (%)</label>
                <input className="input-field" type="number" min={1} max={70} step={0.1} value={profile.body_fat_pct} onChange={e => setField('body_fat_pct', +e.target.value)} />
              </div>

              <div>
                <label className="label">Activity Level</label>
                <select className="input-field" value={profile.activity_level} onChange={e => setField('activity_level', e.target.value)}>
                  {ACTIVITY_KEYS.map(k => <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>)}
                </select>
              </div>

              {/* TDEE preview */}
              {previewTDEE && (
                <div className="flex items-center justify-between p-3 bg-bg border border-border-col/40 rounded-xl">
                  <span className="text-sm text-gray-dark font-medium">Estimated TDEE</span>
                  <span className="text-sm font-extrabold text-primary">{previewTDEE} kcal/day</span>
                </div>
              )}

              {serverError && (
                <div className="flex items-center gap-2 text-danger text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-ghost flex items-center gap-1.5"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    <>
                      <Check size={16} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-mid">
            Already have an account?{' '}
            <button onClick={() => router.push('/login')} className="text-primary font-semibold hover:underline">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
