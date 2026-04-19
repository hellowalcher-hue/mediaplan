// src/components/Calendar/DayColumn.tsx
import { useDroppable } from '@dnd-kit/core'
import type { Activity } from '../../types'
import ActivityCard from '../Cards/ActivityCard'
import './DayColumn.css'

interface Props {
  date:        string
  label:       string
  activities:  Activity[]
  isToday:     boolean
  isWeekend:   boolean
  onClickDay:  () => void
  onClickCard: (a: Activity) => void
}

export default function DayColumn({ date, label, activities, isToday, isWeekend, onClickDay, onClickCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: date })

  // label is like "18.04 | Сб" — split for styling
  const [dateStr, , dayName] = label.split(' ')

  return (
    <div
      ref={setNodeRef}
      className={[
        'day-col',
        isToday   ? 'day-col--today'   : '',
        isWeekend ? 'day-col--weekend' : '',
        isOver    ? 'day-col--over'    : '',
      ].join(' ')}
    >
      <div
        className={`day-col-header ${isToday ? 'day-col-header--today' : ''}`}
        onClick={onClickDay}
      >
        {dateStr} {dayName}
        {isToday && <span className="today-pill">сегодня</span>}
      </div>

      <div className="day-col-inner" onClick={onClickDay}>
        <div className="day-col-empty">+</div>
      </div>

      <div className="day-col-cards" onClick={e => e.stopPropagation()}>
        {activities.map(a => (
          <ActivityCard
            key={a.id}
            activity={a}
            onOpen={() => onClickCard(a)}
          />
        ))}
        {/* Click on empty space below cards */}
        <div style={{ flex: 1, minHeight: 40 }} onClick={onClickDay} />
      </div>
    </div>
  )
}
