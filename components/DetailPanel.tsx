'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVContext } from './CVContext'
import { GROUP_COLORS, TYPE_LABEL } from '@/lib/colors'
import type { GraphNode } from '@/lib/types'
import rawData from '@/data/graph.json'

function getConnectedNodes(nodeId: string): GraphNode[] {
  const connected = new Set<string>()
  rawData.links.forEach(l => {
    const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
    const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
    if (src === nodeId) connected.add(tgt)
    if (tgt === nodeId) connected.add(src)
  })
  connected.delete(nodeId)
  return rawData.nodes.filter(n => connected.has(n.id)) as GraphNode[]
}

function MetaRow({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

export default function DetailPanel() {
  const { selectedNode, setSelectedNode } = useCVContext()

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedNode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedNode])

  return (
    <AnimatePresence>
      {selectedNode && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 md:hidden"
            onClick={() => setSelectedNode(null)}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full z-30 w-80 bg-[#080f18]/95 backdrop-blur-lg border-l border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-5 border-b border-white/10 shrink-0"
              style={{ borderBottomColor: GROUP_COLORS[selectedNode.group] + '33' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
                    style={{
                      backgroundColor: GROUP_COLORS[selectedNode.group] + '22',
                      color: GROUP_COLORS[selectedNode.group],
                    }}
                  >
                    {TYPE_LABEL[selectedNode.type] ?? selectedNode.type}
                  </span>
                  <h2 className="font-bold text-white text-lg leading-snug">
                    {selectedNode.name}
                  </h2>
                  {selectedNode.metadata?.title && selectedNode.type === 'job' && (
                    <p className="text-slate-400 text-sm mt-0.5">{selectedNode.metadata.title as string}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="shrink-0 mt-0.5 text-slate-500 hover:text-white transition-colors p-1"
                  aria-label="Close panel"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Color accent bar */}
              <div
                className="h-0.5 mt-4 rounded-full"
                style={{ backgroundColor: GROUP_COLORS[selectedNode.group] }}
              />
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto timeline-scroll p-5 space-y-6">
              {/* Metadata */}
              <div>
                <MetaRow label="Location"    value={selectedNode.metadata?.location as string} />
                <MetaRow label="Company"     value={selectedNode.metadata?.company as string} />
                <MetaRow label="From"        value={selectedNode.metadata?.start ? formatDate(selectedNode.metadata.start as string) : undefined} />
                <MetaRow label="To"          value={selectedNode.metadata?.end ? formatDate(selectedNode.metadata.end as string) : 'Present'} />
                <MetaRow label="Level"       value={selectedNode.metadata?.level as string} />
                <MetaRow label="Grade"       value={selectedNode.metadata?.grade as string} />
                <MetaRow label="Issuer"      value={selectedNode.metadata?.issuer as string} />
                <MetaRow label="Standard"    value={selectedNode.metadata?.standard as string} />
                <MetaRow label="Email"       value={selectedNode.metadata?.email as string} />
                <MetaRow label="Phone"       value={selectedNode.metadata?.phone as string} />
              </div>

              {/* Description */}
              {selectedNode.metadata?.description && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">About</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {selectedNode.metadata.description as string}
                  </p>
                </div>
              )}

              {/* Bio / self node */}
              {selectedNode.metadata?.bio && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Bio</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {selectedNode.metadata.bio as string}
                  </p>
                  {selectedNode.metadata.linkedin && (
                    <a
                      href={`https://${selectedNode.metadata.linkedin as string}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              )}

              {/* Connected nodes */}
              <ConnectedNodes node={selectedNode} onSelect={setSelectedNode} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return month ? `${names[parseInt(month) - 1]} ${year}` : year
}

function ConnectedNodes({
  node,
  onSelect,
}: {
  node: GraphNode
  onSelect: (n: GraphNode) => void
}) {
  const connected = getConnectedNodes(node.id)
  if (connected.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Connected ({connected.length})
      </h4>
      <div className="space-y-1.5">
        {connected.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm hover:bg-white/8 transition-colors"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: GROUP_COLORS[n.group] ?? '#fff' }}
            />
            <span className="text-slate-300 truncate">{n.name}</span>
            <span className="text-slate-600 text-xs ml-auto shrink-0">{n.type}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
