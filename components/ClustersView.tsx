'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { Group, Mesh, SphereGeometry, MeshLambertMaterial, MeshBasicMaterial, AdditiveBlending, Color, Sprite, SpriteMaterial, CanvasTexture, LinearFilter, Object3D } from 'three'
import { useCVContext } from './CVContext'
import { GROUP_COLORS } from '@/lib/colors'
import type { GraphNode, GraphLink, NodeGroup } from '@/lib/types'
import rawData from '@/data/graph.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false }) as any

function getNodeId(n: string | GraphNode): string {
  return typeof n === 'string' ? n : n.id
}

const BG = '#050A0E'

// ── cluster definitions ──
const CLUSTERS = [
  { id: 'companies', label: 'Companies', groups: ['work'],                                                     color: '#4a90e2', cx: -85, cy: 15, cz: 0 },
  { id: 'tools',     label: 'Tools',     groups: ['tools'],                                                    color: '#9b59b6', cx: 85,  cy: 15, cz: 0 },
  { id: 'skills',    label: 'Skills',    groups: ['testing', 'devops', 'agile', 'soft', 'cert', 'education', 'language', 'infosec'], color: '#2ecc71', cx: 0, cy: -75, cz: 0 },
] as const

function getCluster(node: GraphNode): (typeof CLUSTERS)[number] | null {
  if (node.group === 'core') return null
  return CLUSTERS.find(c => (c.groups as readonly string[]).includes(node.group)) ?? CLUSTERS[2]
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 1 - amount
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`
}

// hub ID → cluster color for parent darkening
const HUB_COLOR: Record<string, string> = {}
CLUSTERS.forEach(c => { HUB_COLOR[`hub-${c.id}`] = c.color })

// ── fibonacci-sphere distribution ──
function distributeInSphere(
  nodes: GraphNode[],
  cx: number, cy: number, cz: number,
  radius: number,
  startIndex = 0
) {
  const n = nodes.length
  nodes.forEach((node, i) => {
    const idx = startIndex + i
    const phi = Math.acos(1 - 2 * (idx + 0.5) / Math.max(n, 1))
    const theta = Math.PI * (1 + Math.sqrt(5)) * idx
    node.fx = cx + radius * Math.sin(phi) * Math.cos(theta)
    node.fy = cy + radius * Math.sin(phi) * Math.sin(theta)
    node.fz = cz + radius * Math.cos(phi)
  })
}

// ── sub-grouped distribution: each group gets its own tight sphere on a larger shell ──
function distributeSubGrouped(
  nodesByGroup: Map<string, GraphNode[]>,
  cx: number, cy: number, cz: number,
  shellRadius: number,
  subRadius: number
) {
  const groups = [...nodesByGroup.entries()]
  const nGroups = groups.length

  groups.forEach(([, groupNodes], gi) => {
    // place sub-group centre on the outer shell
    const phi = Math.acos(1 - 2 * (gi + 0.5) / nGroups)
    const theta = Math.PI * (1 + Math.sqrt(5)) * gi
    const scx = cx + shellRadius * Math.sin(phi) * Math.cos(theta)
    const scy = cy + shellRadius * Math.sin(phi) * Math.sin(theta)
    const scz = cz + shellRadius * Math.cos(phi)

    distributeInSphere(groupNodes, scx, scy, scz, subRadius)
  })
}

// ── canvas-based label sprite ──
function makeLabelSprite(text: string, color: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 28px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, 128, 32)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new Sprite(material)
  sprite.scale.set(28, 7, 1)
  return sprite
}

// ── hub node factory ──
function hubNode(
  id: string, label: string, cx: number, cy: number, cz: number,
  children: string[],
): GraphNode {
  return {
    id,
    name: label,
    type: 'skill',
    group: 'core',
    val: 18,
    fx: cx, fy: cy, fz: cz,
    metadata: { description: `Cluster hub – ${label}`, children },
  }
}

export default function ClustersView() {
  const { selectedNode, setSelectedNode, highlightNodeId } = useCVContext()
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

  // ── build cluster graph: hubs + original nodes + clean hierarchical links ──
  const clusterData = useMemo(() => {
    const originalNodes = (rawData.nodes as GraphNode[]).map(n => ({ ...n }))

    // bucket original nodes
    const buckets = new Map<string, GraphNode[]>()
    CLUSTERS.forEach(c => buckets.set(c.id, []))
    const centerNodes: GraphNode[] = []

    originalNodes.forEach(node => {
      const c = getCluster(node)
      if (c) buckets.get(c.id)!.push(node)
      else centerNodes.push(node)
    })

    // build hub nodes (children set after sub-hubs are created for Skills)
    const hubs: GraphNode[] = CLUSTERS.map(c =>
      hubNode(`hub-${c.id}`, c.label, c.cx, c.cy, c.cz, [])
    )

    // position cores (Zoran) at center
    centerNodes.forEach(n => { n.fx = 0; n.fy = 0; n.fz = 0 })

    // distribute member nodes around each hub
    const subHubs: GraphNode[] = []
    CLUSTERS.forEach(c => {
      const clusterNodes = buckets.get(c.id)!
      if (c.id === 'skills') {
        // ── 3-level: hub → sub-hubs → leaves ──
        const byGroup = new Map<string, GraphNode[]>()
        clusterNodes.forEach(n => {
          const g = n.group
          if (!byGroup.has(g)) byGroup.set(g, [])
          byGroup.get(g)!.push(n)
        })

        const shellRadius = 40
        const groups = [...byGroup.entries()]
        groups.forEach(([group, groupNodes], gi) => {
          // sub-hub position on outer shell
          const phi = Math.acos(1 - 2 * (gi + 0.5) / groups.length)
          const theta = Math.PI * (1 + Math.sqrt(5)) * gi
          const scx = c.cx + shellRadius * Math.sin(phi) * Math.cos(theta)
          const scy = c.cy + shellRadius * Math.sin(phi) * Math.sin(theta)
          const scz = c.cz + shellRadius * Math.cos(phi)

          const subHubId = `subhub-${group}`
          const subHub: GraphNode = {
            id: subHubId,
            name: group.charAt(0).toUpperCase() + group.slice(1),
            type: 'skill',
            group: group as NodeGroup,
            val: 18,
            fx: scx, fy: scy, fz: scz,
            metadata: { description: `${group} (${groupNodes.length})`, children: groupNodes.map(n => n.id) },
          }
          subHubs.push(subHub)

          // leaves orbit sub-hub
          distributeInSphere(groupNodes, scx, scy, scz, 20)
        })
      } else {
        distributeInSphere(clusterNodes, c.cx, c.cy, c.cz, 30)
      }
    })

    // set hub tree metadata for side-panel rendering
    hubs.forEach(h => {
      if (h.id === 'hub-skills') {
        h.metadata!.subGroups = subHubs.map(sh => ({
          id: sh.id,
          name: sh.name,
          group: sh.group,
          children: (sh.metadata!.children as string[]) ?? [],
        }))
      } else {
        const cid = h.id.replace('hub-', '')
        h.metadata!.children = buckets.get(cid)!.map(n => n.id)
      }
    })

    const allNodes = [...centerNodes, ...hubs, ...subHubs, ...originalNodes.filter(n => n.group !== 'core')]

    // ── build clean links ──
    const links: GraphLink[] = []
    const zoranId = centerNodes[0]?.id ?? 'zoran'

    // each hub ↔ Zoran + hubs ↔ hubs (triangle)
    hubs.forEach(h => links.push({ source: zoranId, target: h.id, relation: 'hub' }))
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        links.push({ source: hubs[i].id, target: hubs[j].id, relation: 'sibling' })
      }
    }

    // hub → sub-hub → leaves (Skills cluster)
    subHubs.forEach(sh => {
      links.push({ source: 'hub-skills', target: sh.id, relation: 'contains' })
      const childIds = (sh.metadata!.children as string[]) ?? []
      childIds.forEach(cid => links.push({ source: sh.id, target: cid, relation: 'contains' }))
    })

    // simple clusters: hub → leaves directly
    CLUSTERS.forEach(c => {
      if (c.id === 'skills') return
      const hubId = `hub-${c.id}`
      buckets.get(c.id)!.forEach(n => links.push({ source: hubId, target: n.id, relation: 'contains' }))
    })

    return { nodes: allNodes, links }
  }, [])

  // ── hover highlight using cluster links ──
  const hoverConnected = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const s = new Set([hoveredNode.id])
    clusterData.links.forEach(l => {
      const src = getNodeId(l.source)
      const tgt = getNodeId(l.target)
      if (src === hoveredNode.id) s.add(tgt)
      if (tgt === hoveredNode.id) s.add(src)
    })
    return s
  }, [hoveredNode, clusterData.links])

  // side-panel highlight → connected set
  const highlightConnected = useMemo(() => {
    if (!highlightNodeId) return new Set<string>()
    const s = new Set([highlightNodeId])
    clusterData.links.forEach(l => {
      const src = getNodeId(l.source)
      const tgt = getNodeId(l.target)
      if (src === highlightNodeId) s.add(tgt)
      if (tgt === highlightNodeId) s.add(src)
    })
    return s
  }, [highlightNodeId, clusterData.links])

  // selected-node focus: dim non-connected even without hover
  const selectedConnected = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const s = new Set([selectedNode.id])
    clusterData.links.forEach(l => {
      const src = getNodeId(l.source)
      const tgt = getNodeId(l.target)
      if (src === selectedNode.id) s.add(tgt)
      if (tgt === selectedNode.id) s.add(src)
    })
    return s
  }, [selectedNode, clusterData.links])

  const effectiveHover = highlightNodeId
    ? { id: highlightNodeId, connected: highlightConnected }
    : hoveredNode
      ? { id: hoveredNode.id, connected: hoverConnected }
      : selectedNode
        ? { id: selectedNode.id, connected: selectedConnected }
        : null

  // ── node color ──
  const nodeColor = useCallback(
    (node: GraphNode) => {
      const base = GROUP_COLORS[node.group] ?? '#ffffff'
      if (effectiveHover && !effectiveHover.connected.has(node.id)) return '#1a2030'
      if (selectedNode?.id === node.id) return '#ffffff'
      if (node.id.startsWith('hub-')) return darkenColor(HUB_COLOR[node.id] ?? base, 0.3)
      if (node.id.startsWith('subhub-')) return darkenColor(base, 0.3)
      return base
    },
    [effectiveHover, selectedNode]
  )

  // ── node val accessor (hub > sub-hub > leaf) ──
  const nodeValAccessor = useCallback(
    (node: GraphNode) => {
      if (node.id.startsWith('hub-')) return 24
      if (node.id.startsWith('subhub-')) return 13
      return node.val
    },
    []
  )

  // ── glow on selected ──
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      if (selectedNode?.id !== node.id) return null
      const v = node.id.startsWith('hub-') ? 24 : node.id.startsWith('subhub-') ? 13 : (node.val || 5)
      const size = Math.sqrt(v) * 1.0
      const color = node.id.startsWith('hub-')
        ? darkenColor(HUB_COLOR[node.id] ?? '#ffffff', 0.3)
        : node.id.startsWith('subhub-')
          ? darkenColor(GROUP_COLORS[node.group] ?? '#ffffff', 0.3)
          : GROUP_COLORS[node.group] ?? '#ffffff'
      const group = new Group()
      group.add(new Mesh(new SphereGeometry(size, 16, 16), new MeshLambertMaterial({ color: new Color('#ffffff') })))
      group.add(new Mesh(
        new SphereGeometry(size * 1.55, 32, 32),
        new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.28, blending: AdditiveBlending, depthWrite: false })
      ))
      return group
    },
    [selectedNode]
  )

  // ── link styling ──
  const linkColor = useCallback(
    (link: GraphLink) => {
      if (!effectiveHover) return 'rgba(255,255,255,0.08)'
      const src = getNodeId(link.source)
      const tgt = getNodeId(link.target)
      return src === effectiveHover.id || tgt === effectiveHover.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.02)'
    },
    [effectiveHover]
  )

  const linkWidth = useCallback(
    (link: GraphLink) => {
      if (!effectiveHover) return 0.5
      const src = getNodeId(link.source)
      const tgt = getNodeId(link.target)
      return src === effectiveHover.id || tgt === effectiveHover.id ? 2 : 0.2
    },
    [effectiveHover]
  )

  // ── add label sprites above each hub ──
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const scene = graph.scene()
    const objects: Object3D[] = []
    const disposables: { dispose(): void }[] = []

    CLUSTERS.forEach(c => {
      const sprite = makeLabelSprite(c.label, c.color)
      sprite.position.set(c.cx, c.cy + 22, c.cz)
      scene.add(sprite)
      objects.push(sprite)
      disposables.push(sprite.material as SpriteMaterial, (sprite.material as SpriteMaterial).map!)
    })

    return () => {
      objects.forEach(o => scene.remove(o))
      disposables.forEach(d => d.dispose())
    }
  }, [])

  // ── camera fly-to on select ──
  useEffect(() => {
    if (!selectedNode || !graphRef.current) return
    const node = selectedNode as GraphNode & { x?: number; y?: number; z?: number }
    const distance = 78
    const distRatio = 1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1)
    graphRef.current.cameraPosition(
      { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio },
      node,
      1200
    )
  }, [selectedNode])

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={clusterData}
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
      nodeColor={nodeColor}
      nodeRelSize={3.2}
      nodeOpacity={0.65}
      nodeResolution={16}
      nodeThreeObject={nodeThreeObject}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkOpacity={1}
      onNodeClick={(node: GraphNode) => setSelectedNode(selectedNode?.id === node.id ? null : node)}
      onNodeHover={(node: GraphNode | null) => setHoveredNode(node)}
      enableNodeDrag={false}
      showNavInfo={false}
      warmupTicks={0}
      cooldownTicks={0}
    />
  )
}
