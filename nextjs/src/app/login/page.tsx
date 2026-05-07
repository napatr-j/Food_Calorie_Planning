'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { UtensilsCrossed, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username) { setError('Please enter your username'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    setLoading(false)

    if (res.ok) {
      router.push('/upload')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Sign in failed')
    }
  }

  return (
    <>
      <Navbar />
      <div className="page-fade min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
        <div className="card p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-bg border border-border-col/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Sign In</h1>
            <p className="text-gray-mid text-sm mt-1">Welcome back!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input-field"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-mid hover:text-primary transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-danger text-sm font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-mid">
            Don&apos;t have an account?{' '}
            <button onClick={() => router.push('/register')} className="text-primary font-semibold hover:underline">
              Register
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
