// src/components/Modals/ActivityModal.tsx
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import type { Activity, Task } from '../../types'
import { activitiesApi, tasksApi } from '../../services/api'
import TaskList from '../Tasks/TaskList'
import './ActivityModal.css'

interface Props {
  activity:    Activity | null
  defaultDate: string | null
  onClose:     () => void
}

export default function ActivityModal({ activity, defaultDate, onClose }: Props) {
  const { projects, actTypes, actGroups, refreshActivities } = useApp()
  const isNew = !activity

  const [title,      setTitle]      = useState(activity?.title ?? '')
  const [shortDesc,  setShortDesc]  = useState(activity?.short_desc ?? '')
  const [comment,    setComment]    = useState(activity?.comment ?? '')
  const [dateFrom,   setDateFrom]   = useState(activity?.date_from ?? defaultDate ?? '')
  const [dateTo,     setDateTo]     = useState(activity?.date_to   ?? defaultDate ?? '')
  const [timePublish,setTimePublish]= useState(activity?.time_publish?.slice(0,5) ?? '')
  const [showTime,   setShowTime]   = useState(activity?.show_time ?? false)
  const [isProcess,  setIsProcess]  = useState(activity?.is_process ?? false)
  const [noDeadline, setNoDeadline] = useState(activity?.no_deadline ?? false)
  const [scope,      setScope]      = useState(activity?.deadline_scope ?? 'none')

  const [typeId,    setTypeId]    = useState<number|undefined>(activity?.type_id)
  const [projectId, setProjectId] = useState<number|undefined>(activity?.project_id)
  const [groupId,   setGroupId]   = useState<number|undefined>(activity?.group_id)

  // Details
  const [detailDesc,     setDetailDesc]     = useState(activity?.detail_description ?? '')
  const [detailGoal,     setDetailGoal]     = useState(activity?.detail_goal ?? '')
  const [detailExpected, setDetailExpected] = useState(activity?.detail_expected_result ?? '')
  const [detailActual,   setDetailActual]   = useState(activity?.detail_actual_result ?? '')

  const [extrasOpen, setExtrasOpen] = useState(false)
  const [tab,        setTab]        = useState<'main'|'details'|'tasks'>('main')
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
    if (activity?.id) loadTasks(activity.id)
  }, [])

  async function loadTasks(id: number) {
    const t = await tasksApi.byActivity(id)
    setTasks(t)
  }

  async function save() {
    if (!title.trim()) { titleRef.current?.focus(); return }
    setSaving(true)
    const data: Partial<Activity> = {
      title: title.trim(),
      short_desc: shortDesc || undefined,
      comment: comment || undefined,
      date_from: noDeadline ? undefined : (dateFrom || undefined),
      date_to:   noDeadline ? undefined : (dateTo   || undefined),
      time_publish: timePublish || undefined,
      show_time: showTime,
      is_process: isProcess,
      no_deadline: noDeadline,
      deadline_scope: noDeadline ? (scope as Activity['deadline_scope']) : undefined,
      type_id:    typeId,
      project_id: projectId,
      group_id:   groupId,
      detail_description:     detailDesc     || undefined,
      detail_goal:            detailGoal     || undefined,
      detail_expected_result: detailExpected || undefined,
      detail_actual_result:   detailActual   || undefined,
    } as Partial<Activity>

    try {
      if (isNew) await activitiesApi.create(data)
      else       await activitiesApi.update(activity!.id, data)
      await refreshActivities()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!activity || !confirm('Удалить активность?')) return
    setDeleting(true)
    try {
      await activitiesApi.delete(activity.id)
      await refreshActivities()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const selectedType    = actTypes.find(t => t.id === typeId)
  const selectedProject = projects.find(p => p.id === projectId)
  const selectedGroup   = actGroups.find(g => g.id === groupId)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg activity-modal">

        {/* ── Header ── */}
        <div className="amodal-header">
          <button className="amodal-close" onClick={onClose}>✕</button>

          <input
            ref={titleRef}
            className="amodal-title-input"
            placeholder="Название активности"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
          />

          {/* Tag selectors */}
          <div className="amodal-tags-row">
            <TagSelector
              label="Тип"
              icon="🏷"
              selected={selectedType ? { id: selectedType.id, name: selectedType.name, color: selectedType.color } : null}
              options={actTypes.map(t => ({ id: t.id, name: t.name, color: t.color }))}
              onSelect={id => setTypeId(id)}
            />
            <TagSelector
              label="Проект"
              icon="📁"
              selected={selectedProject ? { id: selectedProject.id, name: `${selectedProject.emoji} ${selectedProject.name}`, color: selectedProject.color } : null}
              options={projects.map(p => ({ id: p.id, name: `${p.emoji} ${p.name}`, color: p.color }))}
              onSelect={id => setProjectId(id)}
            />
            <TagSelector
              label="Группа"
              icon="📎"
              selected={selectedGroup ? { id: selectedGroup.id, name: selectedGroup.name, color: selectedGroup.color } : null}
              options={actGroups.map(g => ({ id: g.id, name: g.name, color: g.color }))}
              onSelect={id => setGroupId(id)}
            />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="amodal-tabs">
          {(['main','details','tasks'] as const).map(t => (
            <button
              key={t}
              className={`amodal-tab ${tab === t ? 'amodal-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'main'    && 'Основное'}
              {t === 'details' && 'Детали'}
              {t === 'tasks'   && `Задачи${tasks.length ? ` (${tasks.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="amodal-body">
          {tab === 'main' && (
            <>
              {/* Short description */}
              <textarea
                className="amodal-desc-input"
                placeholder="Краткое описание — отображается на карточке"
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value)}
                rows={2}
              />

              {/* Dates */}
              {!noDeadline && (
                <div className="amodal-dates">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Период</span>
                  <div className="amodal-date-btn">
                    📅 {dateFrom || 'Начало'}
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <span className="amodal-date-sep">→</span>
                  <div className="amodal-date-btn">
                    {dateTo || 'Конец'}
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Comment */}
              <div className="amodal-comment">
                <label className="label">Комментарий → (отображается на карточке)</label>
                <textarea
                  className="amodal-comment-input"
                  placeholder="→ Дополнительная заметка или инструкция"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Extras toggle */}
              <button className="amodal-extras-toggle" onClick={() => setExtrasOpen(o => !o)}>
                <span className="amodal-extras-toggle-icon">{extrasOpen ? '▲' : '▼'}</span>
                {extrasOpen ? 'Скрыть доп. параметры' : 'Доп. параметры'}
              </button>

              {extrasOpen && (
                <div className="amodal-extras">
                  <div className="amodal-checks">
                    <label className="amodal-check">
                      <input type="checkbox" checked={isProcess} onChange={e => setIsProcess(e.target.checked)} />
                      Вид «Процесс»
                    </label>
                    <label className="amodal-check">
                      <input type="checkbox" checked={noDeadline} onChange={e => setNoDeadline(e.target.checked)} />
                      Без конкретного срока
                    </label>
                  </div>

                  {noDeadline && (
                    <div className="form-row">
                      <label className="label">Период (для боковой панели)</label>
                      <select className="select" value={scope} onChange={e => setScope(e.target.value)}>
                        <option value="week">На этой неделе</option>
                        <option value="month">В этом месяце</option>
                        <option value="none">Без срока</option>
                      </select>
                    </div>
                  )}

                  <div className="amodal-extras-grid">
                    <div className="form-row">
                      <label className="label">Время выхода</label>
                      <input type="time" className="input" value={timePublish} onChange={e => setTimePublish(e.target.value)} />
                    </div>
                    <div className="form-row" style={{ justifyContent: 'flex-end' }}>
                      <label className="amodal-check" style={{ marginTop: 22 }}>
                        <input type="checkbox" checked={showTime} onChange={e => setShowTime(e.target.checked)} />
                        Показывать время на карточке
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <label className="label">Подробное описание</label>
                <textarea className="input" style={{ minHeight: 90 }} value={detailDesc} onChange={e => setDetailDesc(e.target.value)} placeholder="Развёрнутое описание активности" />
              </div>
              <div className="form-row">
                <label className="label">Цель</label>
                <textarea className="input" style={{ minHeight: 72 }} value={detailGoal} onChange={e => setDetailGoal(e.target.value)} placeholder="Чего хотим достичь" />
              </div>
              <div className="form-row">
                <label className="label">Ожидаемый результат</label>
                <textarea className="input" style={{ minHeight: 72 }} value={detailExpected} onChange={e => setDetailExpected(e.target.value)} placeholder="Что планируем получить" />
              </div>
              <div className="form-row">
                <label className="label">Полученный результат</label>
                <textarea className="input" style={{ minHeight: 72 }} value={detailActual} onChange={e => setDetailActual(e.target.value)} placeholder="Фактический результат после выхода" />
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            activity
              ? <TaskList activityId={activity.id} tasks={tasks} onReload={() => loadTasks(activity.id)} />
              : <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '20px 0' }}>Сохраните активность, чтобы добавить задачи.</p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="amodal-footer">
          <div className="amodal-footer-left">
            {!isNew && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Удалить'}
              </button>
            )}
          </div>
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : isNew ? 'Создать' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tag Selector dropdown component ──
function TagSelector({ label, icon, selected, options, onSelect }: {
  label:    string
  icon:     string
  selected: { id: number; name: string; color: string } | null
  options:  { id: number; name: string; color: string }[]
  onSelect: (id: number | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`tag-selector ${selected ? 'selected' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={selected ? {
          background: selected.color + '22',
          borderColor: selected.color + '55',
          color: selected.color,
        } : {}}
      >
        {selected ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: selected.color, display: 'inline-block', flexShrink: 0 }} />
            {selected.name}
          </>
        ) : (
          <>{icon} {label}</>
        )}
        <span style={{ opacity: 0.5, fontSize: 9 }}>▼</span>
      </button>

      {open && (
        <div className="tag-dropdown">
          {options.map(o => (
            <button
              key={o.id}
              className={`tag-dropdown-item ${selected?.id === o.id ? 'active' : ''}`}
              onClick={() => { onSelect(o.id); setOpen(false) }}
            >
              <span className="tag-dropdown-item-dot" style={{ background: o.color }} />
              {o.name}
            </button>
          ))}
          {selected && (
            <div className="tag-dropdown-none" onClick={() => { onSelect(undefined); setOpen(false) }}>
              × Убрать
            </div>
          )}
          {options.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 10px' }}>
              Нет вариантов — добавьте в Настройках
            </div>
          )}
        </div>
      )}
    </div>
  )
}
