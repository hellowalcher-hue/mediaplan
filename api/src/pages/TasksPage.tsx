// src/pages/TasksPage.tsx
import { useEffect, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import type { Task } from '../types'
import { tasksApi } from '../services/api'
import './TasksPage.css'

const STATUS_LABELS: Record<string, string> = {
  todo:        'Не начата',
  in_progress: 'В работе',
  done:        'Готово',
  cancelled:   'Отменена',
}

const STATUS_COLORS: Record<string, string> = {
  todo:        '#9B9A96',
  in_progress: '#D97706',
  done:        '#16A34A',
  cancelled:   '#DC2626',
}

type GroupBy = 'activity' | 'project' | 'assignee' | 'status'

export default function TasksPage() {
  const { projects, assignees } = useApp()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [groupBy, setGroupBy]   = useState<GroupBy>('status')
  const [filterProject,  setFilterProject]  = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')

  async function load() {
    setLoading(true)
    const q: Record<string, string> = {}
    if (filterProject)  q.project_id  = filterProject
    if (filterAssignee) q.assignee_id = filterAssignee
    if (filterStatus)   q.status      = filterStatus
    const data = await tasksApi.listAll(q)
    setTasks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterProject, filterAssignee, filterStatus]) // eslint-disable-line

  async function updateTask(id: number, data: Partial<Task>) {
    await tasksApi.update(id, data)
    load()
  }

  // ---- Grouping logic ----
  function grouped(): { label: string; tasks: Task[]; color?: string }[] {
    if (groupBy === 'status') {
      return ['todo', 'in_progress', 'done', 'cancelled'].map(s => ({
        label: STATUS_LABELS[s],
        color: STATUS_COLORS[s],
        tasks: tasks.filter(t => t.status === s),
      })).filter(g => g.tasks.length > 0)
    }

    if (groupBy === 'project') {
      const map = new Map<string, Task[]>()
      tasks.forEach(t => {
        const key = t.project_name ?? '— без проекта —'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      })
      return [...map.entries()].map(([label, tasks]) => ({
        label,
        color: tasks[0]?.project_color,
        tasks,
      }))
    }

    if (groupBy === 'assignee') {
      const map = new Map<string, Task[]>()
      tasks.forEach(t => {
        const key = t.assignee_name ?? '— не назначен —'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      })
      return [...map.entries()].map(([label, tasks]) => ({
        label,
        color: tasks[0]?.assignee_color,
        tasks,
      }))
    }

    // groupBy === 'activity'
    const map = new Map<string, Task[]>()
    tasks.forEach(t => {
      const key = t.activity_title ?? '— без активности —'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return [...map.entries()].map(([label, tasks]) => ({ label, tasks }))
  }

  const groups = grouped()

  return (
    <div className="tasks-page">
      <div className="tasks-toolbar">
        <h1 className="tasks-title">Задачи</h1>

        <div className="tasks-controls">
          {/* Group by */}
          <div className="control-group">
            <span className="control-label">Группировка:</span>
            {(['status','project','assignee','activity'] as GroupBy[]).map(g => (
              <button
                key={g}
                className={`chip ${groupBy === g ? 'active' : ''}`}
                onClick={() => setGroupBy(g)}
              >
                {g === 'status'   && 'По статусу'}
                {g === 'project'  && 'По проекту'}
                {g === 'assignee' && 'По исполнителю'}
                {g === 'activity' && 'По активности'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="control-group">
            <span className="control-label">Фильтр:</span>
            <select className="select" style={{ width: 140 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="">Все проекты</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
            <select className="select" style={{ width: 160 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">Все исполнители</option>
              {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="tasks-body">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="tasks-empty">Задач не найдено</div>
        ) : (
          <div className="tasks-groups">
            {groups.map(group => (
              <TaskGroup
                key={group.label}
                label={group.label}
                color={group.color}
                tasks={group.tasks}
                assignees={assignees}
                onUpdate={updateTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Task Group ----
function TaskGroup({ label, color, tasks, assignees, onUpdate }: {
  label:     string
  color?:    string
  tasks:     Task[]
  assignees: import('../types').Assignee[]
  onUpdate:  (id: number, data: Partial<Task>) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="task-group">
      <button className="task-group-header" onClick={() => setOpen(o => !o)}>
        {color && <span className="task-group-dot" style={{ background: color }} />}
        <span className="task-group-label">{label}</span>
        <span className="task-group-count">{tasks.length}</span>
        <span className="task-group-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="task-group-rows">
          <div className="task-table-header">
            <span className="tc-check" />
            <span className="tc-title">Задача</span>
            <span className="tc-activity">Активность</span>
            <span className="tc-project">Проект</span>
            <span className="tc-assignee">Исполнитель</span>
            <span className="tc-deadline">Дедлайн</span>
            <span className="tc-status">Статус</span>
          </div>
          {tasks.map(task => (
            <TaskTableRow key={task.id} task={task} assignees={assignees} onUpdate={data => onUpdate(task.id, data)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Task Table Row ----
function TaskTableRow({ task, assignees, onUpdate }: {
  task:      Task
  assignees: import('../types').Assignee[]
  onUpdate:  (d: Partial<Task>) => void
}) {
  const isDone = task.status === 'done'

  return (
    <div className={`task-table-row ${isDone ? 'task-table-row--done' : ''}`}>
      <span className="tc-check">
        <button
          className={`task-check ${isDone ? 'task-check--done' : ''}`}
          onClick={() => onUpdate({ status: isDone ? 'todo' : 'done' })}
        >
          {isDone ? '✓' : ''}
        </button>
      </span>

      <span className="tc-title">{task.title}</span>

      <span className="tc-activity">
        {task.activity_title && (
          <span className="task-ref">{task.activity_title}</span>
        )}
      </span>

      <span className="tc-project">
        {task.project_name && (
          <span className="tag" style={{
            background: (task.project_color ?? '#888') + '22',
            color: task.project_color ?? '#888',
          }}>
            {task.project_emoji} {task.project_name}
          </span>
        )}
      </span>

      <span className="tc-assignee">
        <select
          className="select select-inline"
          value={task.assignee_id ?? ''}
          onChange={e => onUpdate({ assignee_id: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">—</option>
          {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </span>

      <span className="tc-deadline">
        <input
          type="date"
          className="input input-inline"
          value={task.deadline ?? ''}
          onChange={e => onUpdate({ deadline: e.target.value || undefined })}
        />
      </span>

      <span className="tc-status">
        <select
          className="select select-inline"
          value={task.status}
          onChange={e => onUpdate({ status: e.target.value as Task['status'] })}
          style={{ color: STATUS_COLORS[task.status] }}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </span>
    </div>
  )
}
