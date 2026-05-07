import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CalorieBarProps {
  label?: string | ReactNode
  current: number
  total: number
  heightPx?: number
  showText?: boolean
}

export function CalorieBar({ label, current, total, heightPx = 10, showText = true }: CalorieBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0
  const isOver = pct >= 100

  return (
    <div className="mb-3">
      {(label || showText) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-gray-dark font-medium">{label}</span>}
          {showText && (
            <span className="text-xs font-semibold text-primary ml-auto">
              {Math.round(current)} / {Math.round(total)} kcal &nbsp;
              <span className={cn('font-bold', isOver ? 'text-danger' : 'text-gray-dark')}>
                ({Math.round(pct)}%)
              </span>
            </span>
          )}
        </div>
      )}
      <div className="rounded-full overflow-hidden bg-bg border border-border-col/40" style={{ height: heightPx }}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isOver ? 'bg-danger' : 'bg-primary',
          )}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  )
}

interface RemainingBarProps {
  remaining: number
  dailyGoal: number
}

export function RemainingBar({ remaining, dailyGoal }: RemainingBarProps) {
  const goal = dailyGoal > 0 ? dailyGoal : 2000
  const consumed = goal - remaining
  const pct = Math.min(Math.max((consumed / goal) * 100, 0), 100)
  const isOver = remaining < 0

  return (
    <div className="card p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-primary">Daily Calories</span>
        {isOver ? (
          <span className="text-sm font-bold text-danger">
            Over by {Math.abs(remaining).toFixed(0)} kcal
          </span>
        ) : (
          <span className="text-sm font-semibold text-gray-dark">
            {remaining.toFixed(0)} kcal remaining
          </span>
        )}
      </div>
      <div className="rounded-full overflow-hidden bg-bg border border-border-col/40 h-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isOver ? 'bg-danger' : 'bg-primary',
          )}
          style={{ width: `${Math.max(pct, 0.5)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-mid">{consumed.toFixed(0)} kcal consumed</span>
        <span className="text-xs text-gray-mid">Goal: {goal.toFixed(0)} kcal</span>
      </div>
      {isOver && (
        <p className="text-danger text-xs font-semibold mt-2 flex items-center gap-1">
          You have exceeded today&apos;s goal
        </p>
      )}
    </div>
  )
}
