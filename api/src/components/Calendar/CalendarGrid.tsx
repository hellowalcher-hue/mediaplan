// src/components/Calendar/CalendarGrid.tsx
import { useApp } from '../../contexts/AppContext'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import { useState } from 'react'
import { parseDate, formatDate, addDays, daysInRange, dayLabel, RU_DAYS_SHORT, isToday } from '../../utils/date'
import type { Activity } from '../../types'
import DayColumn from './DayColumn'
import GroupBanner from './GroupBanner'
import ActivityCard from '../Cards/ActivityCard'
import { activitiesApi } from '../../services/api'
import './CalendarGrid.css'

interface Props {
  onClickDay:  (date: string) => void
  onClickCard: (a: Activity) => void
}

export default function CalendarGrid({ onClickDay, onClickCard }: Props) {
  const { dateRange, actGroups, activities, refreshActivities } = useApp()
  const [dragging, setDragging] = useState<Activity | null>(null)

  const from = parseDate(dateRange.from)
  const to   = parseDate(dateRange.to)
  const days  = daysInRange(from, to)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  function activitiesForDay(date: Date) {
    const ds = formatDate(date)
    return activities.filter(a => {
      if (!a.date_from) return false
      const af = a.date_from
      const at = a.date_to ?? a.date_from
      return af <= ds && at >= ds
    })
  }

  function groupsForDay(date: Date) {
    const ds = formatDate(date)
    return actGroups.filter(g => g.date_from <= ds && g.date_to >= ds)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setDragging(null)
    if (!over || active.id === over.id) return

    const activityId = Number(active.id)
    const targetDate = String(over.id)       // over.id is the date string YYYY-MM-DD

    const activity = activities.find(a => a.id === activityId)
    if (!activity) return

    // Calculate duration to preserve multi-day activities
    const origFrom = activity.date_from ? parseDate(activity.date_from) : new Date()
    const origTo   = activity.date_to   ? parseDate(activity.date_to)   : origFrom
    const duration = Math.round((origTo.getTime() - origFrom.getTime()) / 86400000)

    const newFrom = parseDate(targetDate)
    const newTo   = addDays(newFrom, duration)

    try {
      await activitiesApi.move(activityId, formatDate(newFrom), formatDate(newTo))
      await refreshActivities()
    } catch { /* silent */ }
  }

  function handleDragStart(e: DragStartEvent) {
    const activity = activities.find(a => a.id === Number(e.active.id))
    setDragging(activity ?? null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="cal-grid">
        {/* Group banners — rendered as full-width rows above the columns */}
        {actGroups.length > 0 && (
          <div className="groups-row">
            <div className="groups-col-spacer" />
            <div className="groups-cols">
              {days.map(day => {
                const dayGroups = groupsForDay(day)
                return (
                  <div key={formatDate(day)} className="group-cell">
                    {dayGroups.map(g => (
                      <GroupBanner key={g.id} group={g} isStart={g.date_from === formatDate(day)} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Day columns */}
        <div className="day-columns">
          {days.map(day => {
            const ds = formatDate(day)
            const dayActivities = activitiesForDay(day)
            const today = isToday(day)
            const dayOfWeek = day.getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            return (
              <DayColumn
                key={ds}
                date={ds}
                label={`${dayLabel(day)} | ${RU_DAYS_SHORT[dayOfWeek]}`}
                activities={dayActivities}
                isToday={today}
                isWeekend={isWeekend}
                onClickDay={() => onClickDay(ds)}
                onClickCard={onClickCard}
              />
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {dragging && (
          <div style={{ opacity: 0.85, transform: 'rotate(2deg)', pointerEvents: 'none' }}>
            <ActivityCard activity={dragging} onOpen={() => {}} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
