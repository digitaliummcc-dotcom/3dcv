'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { Group, Mesh, SphereGeometry, MeshLambertMaterial, MeshBasicMaterial, AdditiveBlending, Color } from 'three'
import { useCVContext } from './CVContext'
import { GROUP_COLORS } from '@/lib/colors'
import type { GraphNode, GraphLink } from '@/lib/types'
import rawData from '@/data/graph.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false }) as any

function getNodeId(n: string | GraphNode): string {
  return typeof n === 'string' ? n : n.id
}

function lerpColor(a: string, b: string, t: number): string {
  return '#' + new Color(a).lerp(new Color(b), t).getHexString()
}

const BG = '#050A0E'

function animateTo(
  fromRef: React.MutableRefObject<number>,
  setter: (v: number) => void,
  animRef: React.MutableRefObject<number>,
  to: number,
  duration: number,
  onDone?: () => void
) {
  cancelAnimationFrame(animRef.current)
  const from = fromRef.current
  const start = performance.now()

  function tick() {
    const elapsed = performance.now() - start
    const t = Math.min(elapsed / duration, 1)
    // ease-in-out
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const val = from + (to - from) * eased
    fromRef.current = val
    setter(val)
    if (t < 1) {
      animRef.current = requestAnimationFrame(tick)
    } else {
      onDone?.()
    }
  }

  animRef.current = requestAnimationFrame(tick)
}

export default function ForceGraph() {
  const { selectedNode, setSelectedNode, activeFilters } = useCVContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // ── hover with animated transition ──
  const [hoverTarget, setHoverTarget] = useState<GraphNode | null>(null)
  const [hoverProgress, setHoverProgress] = useState(0)
  const hoverProgressRef = useRef(0)
  const hoverAnimRef = useRef(0)

  // ── focus mode (click to isolate connections) ──
  const [focusNode, setFocusNode] = useState<GraphNode | null>(null)
  const [focusProgress, setFocusProgress] = useState(0)
  const focusProgressRef = useRef(0)
  const focusAnimRef = useRef(0)
  const focusConnectedRef = useRef<Set<string>>(new Set())

  // ── resize ──
  useEffect(() => {
    function update() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── clear focus when selection is cleared externally (Escape / backdrop) ──
  useEffect(() => {
    if (!selectedNode && focusNode) {
      setFocusNode(null)
      focusConnectedRef.current = new Set()
      animateTo(focusProgressRef, setFocusProgress, focusAnimRef, 0, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  // ── graph data — always all nodes, links filtered by group filters only ──
  const graphData = useMemo(() => {
    const visibleIds = new Set(
      activeFilters.length === 0
        ? (rawData.nodes as GraphNode[]).map(n => n.id)
        : (rawData.nodes as GraphNode[]).filter(
            n => n.group === 'core' || activeFilters.includes(n.group)
          ).map(n => n.id)
    )
    const links = (rawData.links as GraphLink[]).filter(l => {
      const src = getNodeId(l.source as string | GraphNode)
      const tgt = getNodeId(l.target as string | GraphNode)
      return visibleIds.has(src) && visibleIds.has(tgt)
    })
    return { nodes: rawData.nodes as GraphNode[], links }
  }, [activeFilters])

  // ── connected-node sets ──
  const hoverConnected = useMemo(() => {
    if (!hoverTarget) return new Set<string>()
    const s = new Set([hoverTarget.id])
    rawData.links.forEach(l => {
      const src = getNodeId(l.source)
      const tgt = getNodeId(l.target)
      if (src === hoverTarget.id) s.add(tgt)
      if (tgt === hoverTarget.id) s.add(src)
    })
    return s
  }, [hoverTarget])

  const focusConnected = useMemo(() => {
    if (!focusNode) return new Set<string>()
    const s = new Set([focusNode.id])
    rawData.links.forEach(l => {
      const src = getNodeId(l.source)
      const tgt = getNodeId(l.target)
      if (src === focusNode.id) s.add(tgt)
      if (tgt === focusNode.id) s.add(src)
    })
    return s
  }, [focusNode])

  // Keep ref in sync so exit animation can still read the last focus set
  useEffect(() => {
    focusConnectedRef.current = focusConnected
  }, [focusConnected])

  // ── per-node visibility (group filters) ──
  const nodeVisibility = useCallback(
    (node: GraphNode) => {
      if (activeFilters.length === 0) return true
      return node.group === 'core' || activeFilters.includes(node.group)
    },
    [activeFilters]
  )

  // ── per-node size ──
  const nodeValAccessor = useCallback(
    (node: GraphNode) => {
      if (activeFilters.length === 0) return node.val
      if (node.group === 'core' || activeFilters.includes(node.group)) return node.val
      return 0.3
    },
    [activeFilters]
  )

  // ── node color with hover + focus transitions ──
  const nodeColor = useCallback(
    (node: GraphNode) => {
      const base = GROUP_COLORS[node.group] ?? '#ffffff'

      // Focus-mode dim
      if (focusProgress > 0.01) {
        const connected = focusConnectedRef.current
        if (focusNode?.id === node.id) return '#ffffff'
        if (connected.has(node.id)) return base
        return lerpColor(base, BG, focusProgress * 0.92)
      }

      // Hover dim
      if (hoverTarget && hoverProgress > 0.01) {
        if (hoverTarget.id === node.id) return '#ffffff'
        if (hoverConnected.has(node.id)) return base
        return lerpColor(base, BG, hoverProgress * 0.82)
      }

      // Selected highlight
      if (selectedNode?.id === node.id) return '#ffffff'

      return base
    },
    [focusNode, focusProgress, hoverTarget, hoverProgress, hoverConnected, selectedNode]
  )

  // ── glow ring via nodeThreeObject (replaces default sphere for selected) ──
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      if (selectedNode?.id !== node.id) return null // default rendering

      const size = Math.sqrt(node.val || 5) * 1.0
      const color = GROUP_COLORS[node.group] ?? '#ffffff'
      const group = new Group()

      // main sphere
      const sphereGeo = new SphereGeometry(size, 16, 16)
      const sphereMat = new MeshLambertMaterial({ color: new Color('#ffffff') })
      group.add(new Mesh(sphereGeo, sphereMat))

      // glow halo
      const glowGeo = new SphereGeometry(size * 1.55, 32, 32)
      const glowMat = new MeshBasicMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 0.28,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      group.add(new Mesh(glowGeo, glowMat))

      return group
    },
    [selectedNode]
  )

  // ── link colours ──
  const linkColor = useCallback(
    (link: GraphLink) => {
      if (!hoverTarget) return 'rgba(255,255,255,0.12)'
      const src = getNodeId(link.source as string | GraphNode)
      const tgt = getNodeId(link.target as string | GraphNode)
      if (src === hoverTarget.id || tgt === hoverTarget.id) return 'rgba(255,255,255,0.55)'
      return 'rgba(255,255,255,0.04)'
    },
    [hoverTarget]
  )

  const linkWidth = useCallback(
    (link: GraphLink) => {
      if (!hoverTarget) return 0.6
      const src = getNodeId(link.source as string | GraphNode)
      const tgt = getNodeId(link.target as string | GraphNode)
      return src === hoverTarget.id || tgt === hoverTarget.id ? 2 : 0.3
    },
    [hoverTarget]
  )

  // ── hover handler with animated transition ──
  const onNodeHover = useCallback(
    (node: GraphNode | null) => {
      setHoverTarget(node)
      if (node) {
        animateTo(hoverProgressRef, setHoverProgress, hoverAnimRef, 1, 250)
      } else {
        animateTo(hoverProgressRef, setHoverProgress, hoverAnimRef, 0, 250)
      }
    },
    []
  )

  // ── click handler: select + enter / exit focus mode ──
  const onNodeClick = useCallback(
    (node: GraphNode) => {
      if (selectedNode?.id === node.id) {
        // deselect + unfocus
        setSelectedNode(null)
        setFocusNode(null)
        focusConnectedRef.current = new Set()
        animateTo(focusProgressRef, setFocusProgress, focusAnimRef, 0, 300)
      } else {
        // select new node + enter focus
        setSelectedNode(node)
        setFocusNode(node)
        // focusConnected will be synced to ref via useEffect
        animateTo(focusProgressRef, setFocusProgress, focusAnimRef, 1, 350)
      }
    },
    [selectedNode]
  )

  // ── camera fly-to ──
  useEffect(() => {
    if (!selectedNode || !graphRef.current) return
    const node = selectedNode as GraphNode & { x?: number; y?: number; z?: number }
    const distance = 80
    const distRatio = 1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1)
    graphRef.current.cameraPosition(
      { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio },
      node,
      1200
    )
  }, [selectedNode])

  // ── cleanup animation frames on unmount ──
  useEffect(() => {
    return () => {
      cancelAnimationFrame(hoverAnimRef.current)
      cancelAnimationFrame(focusAnimRef.current)
    }
  }, [])

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={graphData}
      backgroundColor={BG}
      width={dimensions.width}
      height={dimensions.height}
      nodeId="id"
      nodeLabel={(node: GraphNode) =>
        `<div style="background:#0d1b2a;border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:6px 10px;font-size:12px;color:#e2e8f0;max-width:200px">
          <strong>${node.name}</strong>
        </div>`
      }
      nodeVal={nodeValAccessor}
      nodeVisibility={nodeVisibility}
      nodeColor={nodeColor}
      nodeOpacity={0.65}
      nodeResolution={16}
      nodeThreeObject={nodeThreeObject}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkOpacity={1}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      enableNodeDrag
      showNavInfo={false}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      cooldownTicks={200}
    />
  )
}
