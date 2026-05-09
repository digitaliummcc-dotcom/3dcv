'use client'

import { useCVContext } from './CVContext'

export default function ViewToggle() {
  const { activeView, setActiveView } = useCVContext()

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/8 backdrop-blur-sm rounded-full p-1 border border-white/10">
      <button
        onClick={() => setActiveView('graph')}
        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          activeView === 'graph'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        3D Graph
      </button>
      <button
        onClick={() => setActiveView('timeline')}
        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          activeView === 'timeline'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Timeline
      </button>
    </div>
  )
}
