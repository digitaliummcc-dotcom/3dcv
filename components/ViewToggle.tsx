'use client'

import { useCVContext } from './CVContext'

export default function ViewToggle() {
  const { activeView, setActiveView } = useCVContext()

  const btnCls = (view: string) =>
    `px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 ${
      activeView === view
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-400 hover:text-white'
    }`

  return (
    <div className="absolute top-3 sm:top-4 right-1.5 sm:right-4 z-10 flex items-center gap-0.5 bg-white/8 backdrop-blur-sm rounded-full p-0.5 sm:p-1 border border-white/10">
      <button onClick={() => setActiveView('graph')} className={btnCls('graph')}>
        3D Graph
      </button>
      <button onClick={() => setActiveView('clusters')} className={btnCls('clusters')}>
        Clusters
      </button>
      <button onClick={() => setActiveView('timeline')} className={btnCls('timeline')}>
        Timeline
      </button>
    </div>
  )
}
