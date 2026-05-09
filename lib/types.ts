export type NodeType =
  | 'self'
  | 'job'
  | 'skill'
  | 'education'
  | 'cert'
  | 'language'
  | 'hobby'
  | 'infosec'
  | 'soft'

export type NodeGroup =
  | 'core'
  | 'work'
  | 'testing'
  | 'tools'
  | 'devops'
  | 'agile'
  | 'education'
  | 'cert'
  | 'language'
  | 'hobby'
  | 'soft'
  | 'infosec'

export interface NodeMetadata {
  company?: string
  title?: string
  start?: string
  end?: string
  location?: string
  description?: string
  level?: string
  years?: number
  grade?: string
  bio?: string
  email?: string
  linkedin?: string
  phone?: string
  issuer?: string
  year?: number
  standard?: string
  [key: string]: unknown
}

export interface GraphNode {
  id: string
  name: string
  type: NodeType
  group: NodeGroup
  val: number
  metadata?: NodeMetadata
  // runtime fields added by force-graph physics
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
  fx?: number
  fy?: number
  fz?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  relation?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface TimelineEvent {
  id: string
  title: string
  subtitle: string
  type: 'job' | 'education' | 'cert' | 'milestone'
  startDate: string
  endDate?: string
  description: string
  skills: string[]
  nodeId?: string
}
