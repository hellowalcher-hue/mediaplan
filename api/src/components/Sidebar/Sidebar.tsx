// src/components/Sidebar/Sidebar.tsx
import { useApp } from '../../contexts/AppContext'
import type { Activity } from '../../types'
import { hexAlpha, lighten } from '../../utils/color'
import './Sidebar.css'

interface Props {
  onOpenActivity:  (a: Activity) => void
  onCreateActivity: (date: string) => void
}

export default function Sidebar({ onOpenActivity, onCreateActivity }: Props) {
  const { noDeadlineActivities } = useApp()

  const weekly  = noDeadlineActivities.filter(a => a.deadline_scope === 'week')
  const monthly = noDeadlineActivities.filter(a => a.deadline_scope === 'month')
  const none    = noDeadlineActivities.filter(a => !a.deadline_scope || a.deadline_scope === 'none')

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Без срока</span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => onCreateActivity('')}
          title="Добавить без срока"
          style={{ padding: '2px 6px', fontSize: 16 }}
        >+</button>
      </div>

      <div className="sidebar-body">
        <SidebarSection label="На этой неделе" activities={weekly} onOpen={onOpenActivity} />
        <SidebarSection label="В этом месяце"  activities={monthly} onOpen={onOpenActivity} />
        <SidebarSection label="Без срока"      activities={none}   onOpen={onOpenActivity} />
      </div>
    </aside>
  )
}

function SidebarSection({ label, activities, onOpen }: {
  label: string
  activities: Activity[]
  onOpen: (a: Activity) => void
}) {
  if (activities.length === 0) return null

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">{label}</div>
      {activities.map(a => (
        <div
          key={a.id}
          className={`sidebar-card ${a.status === 'done' ? 'sidebar-card--done' : ''}`}
          style={{
            borderLeftColor: a.project_color ?? 'var(--border-md)',
            background: a.project_color ? lighten(a.project_color, 0.94) : 'var(--surface)',
          }}
          onClick={() => onOpen(a)}
        >
          {a.type_name && (
            <span className="sidebar-tag" style={{
              background: hexAlpha(a.type_color ?? '#888', 0.15),
              color: a.type_color ?? '#888',
            }}>
              {a.type_name}
            </span>
          )}
          <div className="sidebar-card-title">{a.title}</div>
          {a.project_name && (
            <div className="sidebar-card-project">{a.project_emoji} {a.project_name}</div>
          )}
        </div>
      ))}
    </div>
  )
}
