// src/components/Cards/ActivityCard.tsx
import { useDraggable } from '@dnd-kit/core'
import { useApp } from '../../contexts/AppContext'
import type { Activity } from '../../types'
import './ActivityCard.css'

// Soft pastel palettes per project color
function getSoftBg(hex: string): { bg: string; text: string } {
  // Parse hex to RGB
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  // Very light pastel bg
  const bg = `rgba(${r},${g},${b},0.13)`
  // Darker text
  const text = `rgb(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)})`
  return { bg, text }
}

// Fallback palettes for cards without project color
const CARD_PALETTES = [
  { bg: '#EEF3FF', text: '#2D4BA0' },
  { bg: '#F0FDF4', text: '#166534' },
  { bg: '#FFF7ED', text: '#9A3412' },
  { bg: '#FDF4FF', text: '#6B21A8' },
  { bg: '#FFFBEB', text: '#92400E' },
  { bg: '#F0F9FF', text: '#075985' },
]

function getCardPalette(id: number, projectColor?: string) {
  if (projectColor) return getSoftBg(projectColor)
  return CARD_PALETTES[id % CARD_PALETTES.length]
}

interface Props {
  activity:    Activity
  onOpen:      () => void
  isDragging?: boolean
}

export default function ActivityCard({ activity: a, onOpen, isDragging }: Props) {
  const { updateActivity } = useApp()
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: a.id,
    disabled: isDragging,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px,${transform.y}px,0)`,
    zIndex: 99,
  } : undefined

  const isDone = a.status === 'done'
  const palette = getCardPalette(a.id, a.project_color)
  const isMultiDay = a.date_from && a.date_to && a.date_from !== a.date_to

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    await updateActivity(a.id, { status: isDone ? 'active' : 'done' })
  }

  return (
    <div
      ref={setNodeRef}
      className={[
        'activity-card',
        isDone       ? 'activity-card--done'    : '',
        a.is_process ? 'activity-card--process' : '',
        isDragging   ? 'activity-card--dragging': '',
      ].join(' ')}
      style={{
        ...style,
        background: palette.bg,
        color: palette.text,
      }}
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      {/* Tags */}
      <div className="card-tags">
        {a.type_name && (
          <span className="tag" style={{
            background: 'rgba(0,0,0,0.08)',
            color: 'inherit',
          }}>
            {a.type_name}
          </span>
        )}
        {a.group_name && (
          <span className="tag" style={{
            background: 'rgba(0,0,0,0.06)',
            color: 'inherit',
            opacity: 0.8,
          }}>
            {a.group_name}
          </span>
        )}
        {a.project_name && (
          <span className="tag" style={{
            background: 'rgba(0,0,0,0.08)',
            color: 'inherit',
          }}>
            {a.project_emoji} {a.project_name}
          </span>
        )}
      </div>

      {/* Content */}
      {a.is_process ? (
        <div className="card-process-text">
          {a.title}
          {a.comment && <span> — {a.comment}</span>}
        </div>
      ) : (
        <>
          <div className="card-title">{a.title}</div>
          {a.short_desc && <div className="card-desc">{a.short_desc}</div>}
          {a.comment && (
            <div className="card-comment-block">→ {a.comment}</div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="card-footer">
        <div className="card-indicators">
          {a.show_time && a.time_publish && (
            <span className="card-time">🕐 {a.time_publish.slice(0,5)}</span>
          )}
          {isMultiDay && (
            <span className="card-badge">
              {a.date_from?.slice(8)}.{a.date_from?.slice(5,7)}–{a.date_to?.slice(8)}.{a.date_to?.slice(5,7)}
            </span>
          )}
          {a.has_details && <span className="card-icon">📝</span>}
          {a.tasks_count > 0 && (
            <span className="card-icon">
              ☑ {a.tasks_done_count}/{a.tasks_count}
            </span>
          )}
        </div>

        <button
          className={`done-btn ${isDone ? 'done-btn--done' : ''}`}
          onClick={toggleDone}
          title={isDone ? 'Вернуть в работу' : 'Отметить выполненным'}
        >
          {isDone ? '✓' : ''}
        </button>
      </div>
    </div>
  )
}
