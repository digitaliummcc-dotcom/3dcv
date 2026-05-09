'use client'

import dynamic from 'next/dynamic'
import { CVProvider, useCVContext } from '@/components/CVContext'
import FilterBar from '@/components/FilterBar'
import ViewToggle from '@/components/ViewToggle'
import DetailPanel from '@/components/DetailPanel'
import TimelineView from '@/components/TimelineView'

// Load the 3D graph only in the browser
const ForceGraph = dynamic(() => import('@/components/ForceGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen text-slate-500 text-sm">
      Loading 3D graph…
    </div>
  ),
})

function CVApp() {
  const { activeView } = useCVContext()

  return (
    <div className="relative w-screen h-screen bg-[#050A0E] overflow-hidden">
      {/* Header identity strip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <p className="text-white/40 text-xs tracking-[0.2em] uppercase">
          Zoran Šapić · Quality Manager / Lead Senior QA Engineer
        </p>
      </div>

      {/* View toggle */}
      <ViewToggle />

      {/* Filter chips — only shown in graph view */}
      {activeView === 'graph' && <FilterBar />}

      {/* Main canvas */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: activeView === 'graph' ? 1 : 0, pointerEvents: activeView === 'graph' ? 'auto' : 'none' }}
      >
        <ForceGraph />
      </div>

      {/* Timeline */}
      {activeView === 'timeline' && (
        <div className="absolute inset-0 pt-14">
          <TimelineView />
        </div>
      )}

      {/* Detail panel — floats over both views */}
      <DetailPanel />

      {/* Bottom hint */}
      {activeView === 'graph' && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-slate-600 text-xs pointer-events-none">
          Drag · Scroll to zoom · Click a node to explore
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <CVProvider>
      <CVApp />
    </CVProvider>
  )
}
