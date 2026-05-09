'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVContext } from './CVContext'
import { GROUP_COLORS } from '@/lib/colors'
import type { TimelineEvent } from '@/lib/types'
import rawEvents from '@/data/timeline.json'

const TYPE_COLOR: Record<string, string> = {
  job:       GROUP_COLORS.work,
  education: GROUP_COLORS.education,
  cert:      GROUP_COLORS.cert,
  milestone: GROUP_COLORS.soft,
}

const TYPE_ICON: Record<string, string> = {
  job:       '💼',
  education: '🎓',
  cert:      '🏅',
  milestone: '⭐',
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Present'
  const [year, month] = dateStr.split('-')
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return month ? `${monthNames[parseInt(month) - 1]} ${year}` : year
}

function calcDuration(start: string, end?: string): string {
  const startDate = new Date(start + '-01')
  const endDate = end ? new Date(end + '-01') : new Date()
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}mo`
  if (rem === 0) return `${years}yr`
  return `${years}yr ${rem}mo`
}

export default function TimelineView() {
  const { selectedNode, setSelectedNode } = useCVContext()

  const events = useMemo(
    () => [...(rawEvents as TimelineEvent[])].sort(
      (a, b) => new Date(b.startDate + '-01').getTime() - new Date(a.startDate + '-01').getTime()
    ),
    []
  )

  return (
    <div className="timeline-scroll h-full overflow-y-auto px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white">Career Timeline</h2>
        <p className="text-slate-400 text-sm mt-1">25+ years of experience — click any event to explore</p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

        <AnimatePresence>
          {events.map((event, i) => {
            const color = TYPE_COLOR[event.type] ?? '#4a90e2'
            const isSelected = selectedNode?.id === event.nodeId
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={`relative pl-12 pb-8 cursor-pointer group`}
                onClick={() => {
                  if (event.nodeId) {
                    const node = { id: event.nodeId } as Parameters<typeof setSelectedNode>[0]
                    setSelectedNode(isSelected ? null : node)
                  }
                }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 transition-transform duration-200 group-hover:scale-125"
                  style={{
                    backgroundColor: color,
                    borderColor: color,
                    boxShadow: isSelected ? `0 0 12px ${color}` : undefined,
                  }}
                />

                {/* Card */}
                <div
                  className={`rounded-xl border transition-all duration-200 p-5 ${
                    isSelected
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{TYPE_ICON[event.type]}</span>
                        <span className="text-xs font-medium uppercase tracking-wide"
                          style={{ color }}>
                          {event.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-base leading-snug">
                        {event.title}
                      </h3>
                      <p className="text-slate-400 text-sm">{event.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-slate-300 text-xs">
                        {formatDate(event.startDate)} – {formatDate(event.endDate)}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {calcDuration(event.startDate, event.endDate)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-sm leading-relaxed mt-2">
                    {event.description}
                  </p>

                  {/* Skill chips */}
                  {event.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {event.skills.map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Footer marker */}
        <div className="relative pl-12 pt-2">
          <div
            className="absolute left-2 top-2 w-4 h-4 rounded-full border-2 border-slate-600 bg-[#050A0E]"
          />
          <span className="text-slate-600 text-sm">1997 – University begins</span>
        </div>
      </div>
    </div>
  )
}
