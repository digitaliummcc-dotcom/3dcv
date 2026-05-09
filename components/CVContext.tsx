'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { GraphNode } from '@/lib/types'

type View = 'graph' | 'timeline'

interface CVContextValue {
  selectedNode: GraphNode | null
  setSelectedNode: (node: GraphNode | null) => void
  activeFilters: string[]
  toggleFilter: (group: string) => void
  clearFilters: () => void
  activeView: View
  setActiveView: (view: View) => void
}

const CVContext = createContext<CVContextValue | null>(null)

export function CVProvider({ children }: { children: ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [activeView, setActiveView] = useState<View>('graph')

  const toggleFilter = useCallback((group: string) => {
    setActiveFilters(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }, [])

  const clearFilters = useCallback(() => setActiveFilters([]), [])

  return (
    <CVContext.Provider
      value={{
        selectedNode,
        setSelectedNode,
        activeFilters,
        toggleFilter,
        clearFilters,
        activeView,
        setActiveView,
      }}
    >
      {children}
    </CVContext.Provider>
  )
}

export function useCVContext() {
  const ctx = useContext(CVContext)
  if (!ctx) throw new Error('useCVContext must be used inside CVProvider')
  return ctx
}
