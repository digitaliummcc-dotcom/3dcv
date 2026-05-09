'use client'

import { useCVContext } from './CVContext'
import { FILTER_GROUPS } from '@/lib/colors'

export default function FilterBar() {
  const { activeFilters, toggleFilter, clearFilters } = useCVContext()

  return (
    <div className="absolute top-12 sm:top-4 left-2 sm:left-4 z-10 flex flex-wrap gap-1 sm:gap-1.5 max-w-[calc(100vw-1rem)] sm:max-w-xs">
      {activeFilters.length > 0 && (
        <button
          onClick={clearFilters}
          className="px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          All ×
        </button>
      )}
      {FILTER_GROUPS.map(({ id, label, color }) => {
        const active = activeFilters.includes(id)
        return (
          <button
            key={id}
            onClick={() => toggleFilter(id)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: active ? color + 'cc' : 'rgba(255,255,255,0.07)',
              color: active ? '#fff' : color,
              border: `1px solid ${active ? color : color + '55'}`,
              boxShadow: active ? `0 0 10px ${color}44` : undefined,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
