'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, BookOpen, Flame, Beef, Droplets, Wheat, Candy, UtensilsCrossed, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { FoodCard } from '@/components/food-card'
import { CalorieBar } from '@/components/calorie-bar'
import { cn } from '@/lib/utils'
import type { Food } from '@/lib/types'

const SORT_OPTIONS = [
  { label: 'Name (A–Z)',            value: 'name' },
  { label: 'Calories (low → high)', value: 'kcal_asc' },
  { label: 'Calories (high → low)', value: 'kcal_desc' },
]

// ── Food Modal with multiple images ──────────────────────────────────────────

function FoodModal({ food, onClose }: { food: Food; onClose: () => void }) {
  const [images, setImages] = useState<string[]>([])
  const [imgIndex, setImgIndex] = useState(0)
  const [imgLoading, setImgLoading] = useState(true)

  useEffect(() => {
    setImgLoading(true)
    setImgIndex(0)
    fetch(`/api/foods/images?class=${encodeURIComponent(food.name)}`)
      .then(r => r.ok ? r.json() : [])
      .then((urls: string[]) => {
        // Fall back to the food's own image_url if API returns nothing
        setImages(urls.length > 0 ? urls : (food.image_url ? [food.image_url] : []))
        setImgLoading(false)
      })
      .catch(() => {
        setImages(food.image_url ? [food.image_url] : [])
        setImgLoading(false)
      })
  }, [food.name, food.image_url])

  const prevImg = () => setImgIndex(i => (i - 1 + images.length) % images.length)
  const nextImg = () => setImgIndex(i => (i + 1) % images.length)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto page-fade">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-col">
          <div>
            <h2 className="text-lg font-extrabold text-primary">{food.display_name}</h2>
            <p className="text-sm text-gray-mid">{food.thai_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-mid hover:bg-bg hover:text-primary transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image gallery */}
        <div className="relative w-full h-60 bg-bg overflow-hidden">
          {imgLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-gray-mid" />
            </div>
          ) : images.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={images[imgIndex]}
                src={images[imgIndex]}
                alt={`${food.display_name} ${imgIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {/* Dot indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={cn('w-2 h-2 rounded-full transition-all', i === imgIndex ? 'bg-surface scale-125' : 'bg-surface/50')}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed size={48} className="text-border-col" />
            </div>
          )}
        </div>

        {/* Thumbnail strip for multiple images */}
        {images.length > 1 && (
          <div className="flex gap-2 px-5 pt-3 pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className={cn(
                  'w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                  i === imgIndex ? 'border-primary' : 'border-border-col hover:border-gray-mid'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Nutrition info */}
        <div className="p-5">
          {/* Calorie badge */}
          <div className="flex items-center justify-between p-3 bg-bg rounded-xl mb-4 border border-border-col">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-secondary" />
              <span className="text-sm font-medium text-gray-dark">Calories</span>
            </div>
            <span className="text-xl font-extrabold text-primary">{food.kcal.toFixed(0)} kcal</span>
          </div>

          <h3 className="text-xs font-semibold text-gray-mid uppercase tracking-wide mb-3">Nutrition per serving</h3>

          <CalorieBar label={<span className="flex items-center gap-1.5"><Beef size={13} /> Protein</span>}          current={food.protein_g} total={60}  showText />
          <CalorieBar label={<span className="flex items-center gap-1.5"><Droplets size={13} /> Fat</span>}           current={food.fat_g}     total={80}  showText />
          <CalorieBar label={<span className="flex items-center gap-1.5"><Wheat size={13} /> Carbohydrates</span>}   current={food.carbs_g}   total={300} showText />
          <CalorieBar label={<span className="flex items-center gap-1.5"><Candy size={13} /> Sugar</span>}            current={food.sugar_g}   total={100} showText />

          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border-col text-center">
            {[
              { label: 'Protein', value: food.protein_g.toFixed(1), unit: 'g' },
              { label: 'Fat',     value: food.fat_g.toFixed(1),     unit: 'g' },
              { label: 'Carbs',   value: food.carbs_g.toFixed(1),   unit: 'g' },
              { label: 'Sugar',   value: food.sugar_g.toFixed(1),   unit: 'g' },
            ].map(n => (
              <div key={n.label} className="bg-bg border border-border-col rounded-xl p-3">
                <p className="text-base font-extrabold text-primary">
                  {n.value}<span className="text-xs font-normal text-gray-mid">{n.unit}</span>
                </p>
                <p className="text-xs text-gray-mid mt-0.5">{n.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Library Page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [foods, setFoods] = useState<Food[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, sort_by: sortBy })
    const res = await fetch(`/api/foods?${params}`)
    if (res.ok) setFoods(await res.json())
    setInitialLoadDone(true)
    setLoading(false)
  }, [search, sortBy])

  useEffect(() => {
    const t = setTimeout(fetchFoods, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [fetchFoods, search])

  return (
    <>
      <Navbar />
      <main className="page-fade max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-primary mb-6 flex items-center gap-2">
          <BookOpen size={24} className="text-secondary" />
          Food Library
        </h1>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            {loading && initialLoadDone ? (
              <RefreshCw size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-mid animate-spin pointer-events-none" />
            ) : (
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-mid pointer-events-none" />
            )}
            <input
              ref={searchRef}
              className="input-field pl-9"
              placeholder="Search foods — e.g. pad thai, khao man kai…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-mid hover:text-primary transition-colors"
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <select
            className="input-field sm:w-56"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <p className="text-sm text-gray-mid mb-4 h-5">
          {initialLoadDone && !loading && (
            <><strong className="text-primary">{foods.length}</strong> items found</>
          )}
        </p>

        {/* First-load skeleton */}
        {!initialLoadDone ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-64" />
            ))}
          </div>
        ) : foods.length === 0 && !loading ? (
          <div className="text-center py-20 text-gray-mid">
            <Search size={40} className="mx-auto mb-3 text-border-col" />
            <p className="font-medium text-gray-dark">No items found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          /* Grid with smooth opacity fade during search/filter loading */
          <div className={cn(
            'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-200',
            loading && 'opacity-40 pointer-events-none'
          )}>
            {foods.map(f => (
              <FoodCard key={f.name} food={f} onClick={setSelectedFood} />
            ))}
          </div>
        )}
      </main>

      {selectedFood && (
        <FoodModal food={selectedFood} onClose={() => setSelectedFood(null)} />
      )}
    </>
  )
}
