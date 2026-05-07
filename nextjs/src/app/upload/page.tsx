'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { CalorieBar, RemainingBar } from '@/components/calorie-bar'
import type { ClassifyResult } from '@/lib/types'
import { UploadCloud, RefreshCw, ClipboardList, AlertTriangle, Flame, Beef, Droplets, Wheat, Candy } from 'lucide-react'

const CONFIDENCE_THRESHOLD = 0.6

const TOP5_COLORS = ['var(--primary)', 'var(--secondary)', 'var(--muted)', 'var(--bg)', 'var(--surface)']

function ConfidenceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-dark">{label}</span>
        <span className="font-semibold text-primary">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-bg border border-border-col/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    // Show preview immediately, hide upload zone
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setLowConfidence(false)
    setError('')
    setLoading(true)

    const form = new FormData()
    form.append('file', f)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (res.ok) {
        const data: ClassifyResult = await res.json()
        if (data.confidence < CONFIDENCE_THRESHOLD) {
          // Clear preview so upload zone reappears cleanly
          setPreview(null)
          setLowConfidence(true)
        } else {
          setResult(data)
        }
      } else {
        const d = await res.json()
        setError(d.error ?? 'Analysis failed')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setLowConfidence(false)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Upload zone shows when: no preview (no file selected OR after low-confidence reset)
  // It disappears while analyzing or when results are shown
  const showUploadZone = !loading && !result && !preview

  return (
    <>
      <Navbar />
      <main className="page-fade max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-primary mb-6 flex items-center gap-2">
          <UploadCloud size={24} className="text-secondary" />
          Upload Food Photo
        </h1>

        {/* Hidden file input — always in DOM */}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Low-confidence warning — shown above upload zone when it reappears */}
        {lowConfidence && !loading && !result && (
          <div className="mb-4 p-4 bg-bg border border-border-col rounded-xl flex items-start gap-3">
            <AlertTriangle size={20} className="text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">Could not identify the food</p>
              <p className="text-sm text-gray-dark mt-0.5">
                AI confidence was too low. Please upload a clearer, better-lit photo of a single dish.
              </p>
            </div>
          </div>
        )}

        {/* Upload zone */}
        {showUploadZone && (
          <div className="card p-6 mb-6">
            {/* Use div + onClick to avoid the native label double-trigger bug */}
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-mid/40 rounded-xl p-10 cursor-pointer hover:border-secondary hover:bg-gray-light/60 transition-all duration-200 select-none"
              onClick={() => inputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-bg rounded-2xl flex items-center justify-center mb-3 border border-border-col/40">
                <UploadCloud size={32} className="text-secondary" />
              </div>
              <p className="text-sm font-semibold text-primary">Click to upload a food photo</p>
              <p className="text-xs text-gray-mid mt-1">Supports .jpg, .jpeg, .png</p>
            </div>
          </div>
        )}

        {/* Analyzing state */}
        {loading && preview && (
          <div className="card p-6 mb-6 flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-64 rounded-xl object-contain shadow-sm w-full" />
            <div className="flex items-center gap-2 text-sm text-gray-dark py-2">
              <RefreshCw size={16} className="animate-spin text-secondary" />
              Analyzing your food…
            </div>
          </div>
        )}

        {/* Error state — keep preview visible with error below */}
        {error && !loading && preview && (
          <div className="card p-6 mb-6 flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-64 rounded-xl object-contain shadow-sm w-full" />
            <div className="flex items-center gap-2 text-danger text-sm font-medium">
              <AlertTriangle size={16} />
              {error}
            </div>
            <button className="btn-ghost flex items-center gap-2" onClick={reset}>
              <RefreshCw size={15} /> Try Another Photo
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            <div className="card p-5 grid sm:grid-cols-2 gap-5">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image_url} alt={result.display_name} className="w-full max-h-64 object-cover rounded-xl shadow-sm" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-primary">{result.display_name}</h2>
                <p className="text-gray-mid text-sm mt-0.5">{result.thai_name}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-bg px-3 py-1.5 rounded-full border border-border-col/40">
                  <span className="text-xs text-gray-dark">Confidence</span>
                  <span className="text-xs font-extrabold text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-mid mb-3 uppercase tracking-wide">
                    Top 5 Predictions
                  </p>
                  {result.top5.map((t, i) => (
                    <ConfidenceBar
                      key={t.label}
                      label={`${i + 1}. ${t.label.replace(/_/g, ' ')}`}
                      value={t.confidence}
                      color={TOP5_COLORS[i]}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Nutrition */}
            <div className="card p-5">
              <h3 className="font-bold mb-4 text-primary">Nutrition Facts</h3>
              <CalorieBar label={<span className="flex items-center gap-1"><Flame size={13} /> Calories (kcal)</span>} current={result.kcal} total={Math.max(result.kcal * 2, 800)} showText />
              <CalorieBar label={<span className="flex items-center gap-1"><Beef size={13} /> Protein (g)</span>}  current={result.protein_g} total={60}  showText />
              <CalorieBar label={<span className="flex items-center gap-1"><Droplets size={13} /> Fat (g)</span>}    current={result.fat_g}    total={80}  showText />
              <CalorieBar label={<span className="flex items-center gap-1"><Wheat size={13} /> Carbs (g)</span>}    current={result.carbs_g}  total={300} showText />
              <CalorieBar label={<span className="flex items-center gap-1"><Candy size={13} /> Sugar (g)</span>}    current={result.sugar_g}  total={100} showText />
            </div>

            <RemainingBar remaining={result.remaining_cal} dailyGoal={result.daily_goal} />

            <div className="flex gap-3">
              <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/account')}>
                <ClipboardList size={16} /> View Food Log
              </button>
              <button className="btn-ghost flex items-center gap-2" onClick={reset}>
                <RefreshCw size={16} /> Upload Another
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
