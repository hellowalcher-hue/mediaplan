// src/components/Calendar/CalendarHeader.tsx
import { useApp } from '../../contexts/AppContext'
import { formatDate, startOfWeek, endOfWeek, addDays, parseDate } from '../../utils/date'
import './CalendarHeader.css'

interface Props { onOpenCreate: () => void }

export default function CalendarHeader({ onOpenCreate }: Props) {
  const { dateRange, setDateRange, filters, setFilters, projects, actTypes } = useApp()

  function goWeek(offset: number) {
    const from = parseDate(dateRange.from)
    const newFrom = addDays(from, offset * 7)
    setDateRange({ from: formatDate(newFrom), to: formatDate(addDays(newFrom, 6)) })
  }

  function goToday() {
    const now = new Date()
    setDateRange({ from: formatDate(startOfWeek(now)), to: formatDate(endOfWeek(now)) })
  }

  function toggleProject(id: number) {
    const cur = filters.projectIds
    setFilters({ projectIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }

  function toggleType(id: number) {
    const cur = filters.typeIds
    setFilters({ typeIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }

  function clearFilters() {
    setFilters({ projectIds: [], typeIds: [], groupIds: [] })
  }

  const hasFilters = filters.projectIds.length > 0 || filters.typeIds.length > 0

  // Format date range nicely
  const fromDay = dateRange.from.slice(8) + '.' + dateRange.from.slice(5,7)
  const toDay   = dateRange.to.slice(8)   + '.' + dateRange.to.slice(5,7)
  const year    = dateRange.to.slice(0,4)

  return (
    <div className="cal-header">
      <div className="cal-header-top">
        <div className="date-nav">
          <button className="date-nav-arrow" onClick={() => goWeek(-1)}>‹</button>
          <button className="date-nav-arrow" onClick={() => goWeek(1)}>›</button>
          <span className="date-range-label">{fromDay} — {toDay}.{year}</span>
          <button className="btn btn-sm" onClick={goToday}>Сегодня</button>
        </div>

        <div className="header-right">
          {hasFilters && (
            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={clearFilters}>
              Сбросить ×
            </button>
          )}
          <button className="btn btn-primary" onClick={onOpenCreate}>
            + Активность
          </button>
        </div>
      </div>

      {/* Filters */}
      {(projects.length > 0 || actTypes.length > 0) && (
        <div className="cal-filters">
          {projects.map(p => (
            <button
              key={p.id}
              className={`chip ${filters.projectIds.includes(p.id) ? 'active' : ''}`}
              onClick={() => toggleProject(p.id)}
              style={filters.projectIds.includes(p.id) ? {
                background: p.color,
                borderColor: p.color,
                color: '#fff',
              } : {}}
            >
              {p.emoji} {p.name}
            </button>
          ))}

          {projects.length > 0 && actTypes.length > 0 && (
            <div className="filter-sep" />
          )}

          {actTypes.map(t => (
            <button
              key={t.id}
              className={`chip ${filters.typeIds.includes(t.id) ? 'active' : ''}`}
              onClick={() => toggleType(t.id)}
              style={filters.typeIds.includes(t.id) ? {
                background: t.color,
                borderColor: t.color,
                color: '#fff',
              } : {}}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
