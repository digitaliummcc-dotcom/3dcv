export const GROUP_COLORS: Record<string, string> = {
  core:      '#ffffff',
  work:      '#4a90e2',
  testing:   '#00d4ff',
  tools:     '#9b59b6',
  devops:    '#e67e22',
  agile:     '#2ecc71',
  education: '#f1c40f',
  cert:      '#ffd700',
  language:  '#1abc9c',
  hobby:     '#e91e63',
  soft:      '#7f8c8d',
  infosec:   '#e74c3c',
}

export const TYPE_LABEL: Record<string, string> = {
  self:      'About Me',
  job:       'Work Experience',
  skill:     'Skill',
  education: 'Education',
  cert:      'Certification',
  language:  'Language',
  hobby:     'Hobby',
  soft:      'Soft Skill',
  infosec:   'Security',
}

export const FILTER_GROUPS: { id: string; label: string; color: string }[] = [
  { id: 'work',      label: 'Work',       color: GROUP_COLORS.work },
  { id: 'testing',   label: 'Testing',    color: GROUP_COLORS.testing },
  { id: 'tools',     label: 'Tools',      color: GROUP_COLORS.tools },
  { id: 'devops',    label: 'DevOps',     color: GROUP_COLORS.devops },
  { id: 'agile',     label: 'Agile',      color: GROUP_COLORS.agile },
  { id: 'soft',      label: 'Soft Skills',color: GROUP_COLORS.soft },
  { id: 'cert',      label: 'Certs',      color: GROUP_COLORS.cert },
  { id: 'education', label: 'Education',  color: GROUP_COLORS.education },
  { id: 'language',  label: 'Languages',  color: GROUP_COLORS.language },
  { id: 'infosec',   label: 'Security',   color: GROUP_COLORS.infosec },
  { id: 'hobby',     label: 'Hobbies',    color: GROUP_COLORS.hobby },
]
