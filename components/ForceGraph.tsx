'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { useCVContext } from './CVContext'
import { GROUP_COLORS } from '@/lib/colors'
import type { GraphNode, GraphLink } from '@/lib/types'
import rawData from '@/data/graph.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false }) as any

function getNodeId(n: string | GraphNode): string {
  return typeof n === 'string' ? n : n.id
}

export default function ForceGraph() {
  const { selectedNode, setSelectedNode, activeFilters } = useCVContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    function update() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const filteredData = useMemo(() => {
    const nodes =
      activeFilters.length === 0
        ? (rawData.nodes as GraphNode[])
        : (rawData.nodes as GraphNode[]).filter(
            n => n.group === 'core' || activeFilters.includes(n.group)
          )
    const nodeIds = new Set(nodes.map(n => n.id))
    const links = (rawData.links as GraphLink[]).filter(l => {
      const src = getNodeId(l.source as string | GraphNode)
      const tgt = getNodeId(l.target as string | GraphNode)
      return nodeIds.has(src) && nodeIds.has(tgt)
    })
    return { nodes, links }
  }, [activeFilters])

  const highlightNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const connected = new Set([hoveredNode.id])
    rawData.links.forEach(l => {
      const src = getNodeId(l.source as string | GraphNode)
      const tgt = getNodeId(l.target as string | GraphNode)
      if (src === hoveredNode.id) connected.add(tgt)
      if (tgt === hoveredNode.id) connected.add(src)
    })
    return connected
  }, [hoveredNode])

  // Camera fly-to when a node is selected
  useEffect(() => {
    if (!selectedNode || !graphRef.current) return
    const node = selectedNode as GraphNode & { x?: number; y?: number; z?: number }
    const distance = 80
    const distRatio = 1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1)
    graphRef.current.cameraPosition(
      {
        x: (node.x ?? 0) * distRatio,
        y: (node.y ?? 0) * distRatio,
        z: (node.z ?? 0) * distRatio,
      },
      node,
      1200
    )
  }, [selectedNode])

  const nodeColor = useCallback(
    (node: GraphNode) => {
      const base = GROUP_COLORS[node.group] ?? '#ffffff'
      if (hoveredNode && !highlightNodes.has(node.id)) return '#1a2030'
      if (selectedNode?.id === node.id) return '#ffffff'
      return base
    },
    [hoveredNode, highlightNodes, selectedNode]
  )

  const linkColor = useCallback(
    (link: GraphLink) => {
      if (!hoveredNode) return 'rgba(255,255,255,0.12)'
      const src = getNodeId(link.source as string | GraphNode)
      const tgt = getNodeId(link.target as string | GraphNode)
      if (src === hoveredNode.id || tgt === hoveredNode.id)
        return 'rgba(255,255,255,0.6)'
      return 'rgba(255,255,255,0.04)'
    },
    [hoveredNode]
  )

  const linkWidth = useCallback(
    (link: GraphLink) => {
      if (!hoveredNode) return 0.6
      const src = getNodeId(link.source as string | GraphNode)
      const tgt = getNodeId(link.target as string | GraphNode)
      return src === hoveredNode.id || tgt === hoveredNode.id ? 2 : 0.3
    },
    [hoveredNode]
  )

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={filteredData}
      backgroundColor="#050A0E"
      width={dimensions.width}
      height={dimensions.height}
      nodeId="id"
      nodeLabel={(node: GraphNode) =>
        `<div style="background:#0d1b2a;border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:6px 10px;font-size:12px;color:#e2e8f0;max-width:200px">
          <strong>${node.name}</strong>
        </div>`
      }
      nodeVal="val"
      nodeColor={nodeColor}
      nodeOpacity={0.92}
      nodeResolution={16}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkOpacity={1}
      onNodeClick={(node: GraphNode) => {
        setSelectedNode(selectedNode?.id === node.id ? null : node)
      }}
      onNodeHover={(node: GraphNode | null) => setHoveredNode(node)}
      enableNodeDrag
      showNavInfo={false}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      cooldownTicks={200}
    />
  )
}
