import { Flame, UtensilsCrossed } from 'lucide-react'
import type { Food } from '@/lib/types'

export function FoodCard({ food, onClick }: { food: Food; onClick?: (food: Food) => void }) {
  return (
    <div
      className="card overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(food)}
    >
      <div className="w-full h-44 bg-bg flex items-center justify-center overflow-hidden">
        {food.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={food.image_url}
            alt={food.display_name}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).src = '' ; e.currentTarget.style.display='none' }}
          />
        ) : (
          <UtensilsCrossed size={40} className="text-gray-mid" />
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-primary leading-tight">{food.display_name}</p>
        <p className="text-xs text-gray-mid mt-0.5">{food.thai_name}</p>
        <p className="text-sm font-semibold text-secondary mt-1.5 flex items-center gap-1">
          <Flame size={14} />
          {food.kcal.toFixed(0)} kcal
        </p>
      </div>
    </div>
  )
}
