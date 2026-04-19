// src/components/Tasks/TaskList.tsx
import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import type { Task } from '../../types'
import { tasksApi } from '../../services/api'
import './TaskList.css'

const STATUS_LABELS: Record<string, string> = {
  todo:        '🔲 Не начата',
  in_progress: '🔄 В работе',
  done:        '✅ Готово',
  cancelled:   '❌ Отменена',
}

interface Props {
  activityId: number
  tasks:      Task[]
  onReload:   () => void
}

export default function TaskList({ activityId, tasks, onReload }: Props) {
  const { assignees } = useApp()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function addTask() {
    if (!newTitle.trim()) return
    await tasksApi.create(activityId, { title: newTitle.trim(), status: 'todo' })
    setNewTitle('')
    setAdding(false)
    onReload()
  }

  async function updateTask(id: number, data: Partial<Task>) {
    await tasksApi.update(id, data)
    onReload()
  }

  async function deleteTask(id: number) {
    await tasksApi.delete(id)
    onReload()
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          assignees={assignees}
          onUpdate={data => updateTask(task.id, data)}
          onDelete={() => deleteTask(task.id)}
        />
      ))}

      {adding ? (
        <div className="task-add-row">
          <input
            className="input"
            autoFocus
            placeholder="Название задачи"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addTask()
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
          />
          <button className="btn btn-sm btn-primary" onClick={addTask}>Добавить</button>
          <button className="btn btn-sm" onClick={() => { setAdding(false); setNewTitle('') }}>Отмена</button>
        </div>
      ) : (
        <button className="btn btn-sm btn-ghost" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          + Добавить задачу
        </button>
      )}
    </div>
  )
}

function TaskRow({ task, assignees, onUpdate, onDelete }: {
  task:       Task
  assignees:  import('../../types').Assignee[]
  onUpdate:   (d: Partial<Task>) => void
  onDelete:   () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isDone = task.status === 'done'

  return (
    <div className={`task-row ${isDone ? 'task-row--done' : ''}`}>
      <div className="task-row-main">
        {/* Quick done toggle */}
        <button
          className={`task-check ${isDone ? 'task-check--done' : ''}`}
          onClick={() => onUpdate({ status: isDone ? 'todo' : 'done' })}
        >
          {isDone ? '✓' : ''}
        </button>

        <span className="task-title" onClick={() => setExpanded(e => !e)}>{task.title}</span>

        <div className="task-meta">
          {task.assignee_name && (
            <span className="task-assignee" style={{ background: task.assignee_color + '22', color: task.assignee_color }}>
              {task.assignee_name}
            </span>
          )}
          {task.deadline && (
            <span className="task-deadline">
              {task.deadline.slice(8)}.{task.deadline.slice(5,7)}
            </span>
          )}
          <span className="task-status-badge">{STATUS_LABELS[task.status]}</span>
        </div>

        <button className="btn btn-ghost btn-icon task-expand" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲' : '▼'}
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onDelete} title="Удалить">✕</button>
      </div>

      {expanded && (
        <div className="task-detail">
          <div className="form-cols" style={{ gap: 10 }}>
            <div className="form-row">
              <label className="label">Статус</label>
              <select className="select" value={task.status} onChange={e => onUpdate({ status: e.target.value as Task['status'] })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="label">Ответственный</label>
              <select className="select" value={task.assignee_id ?? ''} onChange={e => onUpdate({ assignee_id: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— не назначен —</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="label">Дедлайн</label>
            <input type="date" className="input" value={task.deadline ?? ''} onChange={e => onUpdate({ deadline: e.target.value || undefined })} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="label">Описание</label>
            <textarea className="textarea" rows={2} value={task.description ?? ''} onChange={e => onUpdate({ description: e.target.value || undefined })} placeholder="Детали задачи" />
          </div>
        </div>
      )}
    </div>
  )
}
