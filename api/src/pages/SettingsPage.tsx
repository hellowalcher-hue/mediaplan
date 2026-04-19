// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { projectsApi, typesApi, groupsApi, assigneesApi } from '../services/api'
import { PALETTE, randomColor } from '../utils/color'
import './SettingsPage.css'

type Section = 'projects' | 'types' | 'groups' | 'assignees'

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('projects')

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'projects',  label: 'Проекты' },
    { id: 'types',     label: 'Типы активностей' },
    { id: 'groups',    label: 'Группы активностей' },
    { id: 'assignees', label: 'Исполнители' },
  ]

  return (
    <div className="settings-page">
      <aside className="settings-nav">
        <div className="settings-nav-title">Настройки</div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`settings-nav-item ${section === s.id ? 'active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </aside>

      <div className="settings-content">
        {section === 'projects'  && <ProjectsSection />}
        {section === 'types'     && <TypesSection />}
        {section === 'groups'    && <GroupsSection />}
        {section === 'assignees' && <AssigneesSection />}
      </div>
    </div>
  )
}

// ── Generic color picker ──
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-picker">
      {PALETTE.map(c => (
        <button
          key={c}
          className={`color-swatch ${value === c ? 'active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="color-custom" title="Произвольный цвет" />
    </div>
  )
}

// ── Projects ──
function ProjectsSection() {
  const { projects, refresh } = useApp()
  const [form, setForm] = useState({ name: '', description: '', emoji: '📁', color: randomColor() })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await projectsApi.create(form)
    await refresh()
    setForm({ name: '', description: '', emoji: '📁', color: randomColor() })
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Удалить проект?')) return
    await projectsApi.delete(id)
    await refresh()
  }

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Проекты</h2>
      <p className="settings-hint">Проекты определяют цвет обводки карточек в календаре.</p>

      <div className="settings-form">
        <div className="form-row">
          <label className="label">Эмодзи</label>
          <input className="input" style={{ width: 64 }} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="📁" />
        </div>
        <div className="form-row">
          <label className="label">Название *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название проекта" />
        </div>
        <div className="form-row">
          <label className="label">Описание</label>
          <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание" />
        </div>
        <div className="form-row">
          <label className="label">Цвет</label>
          <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={saving}>
          {saving ? 'Создаём…' : '+ Создать проект'}
        </button>
      </div>

      <div className="settings-list">
        {projects.map(p => (
          <div key={p.id} className="settings-item" style={{ borderLeftColor: p.color }}>
            <span className="settings-item-emoji">{p.emoji}</span>
            <div className="settings-item-info">
              <div className="settings-item-name">{p.name}</div>
              {p.description && <div className="settings-item-desc">{p.description}</div>}
            </div>
            <div className="color-dot" style={{ background: p.color }} />
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(p.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activity Types ──
function TypesSection() {
  const { actTypes, refresh } = useApp()
  const [form, setForm] = useState({ name: '', color: randomColor() })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await typesApi.create(form)
    await refresh()
    setForm({ name: '', color: randomColor() })
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Удалить тип?')) return
    await typesApi.delete(id)
    await refresh()
  }

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Типы активностей</h2>
      <p className="settings-hint">Отображаются цветным тегом на каждой карточке (IG, TG, Email…).</p>

      <div className="settings-form">
        <div className="form-row">
          <label className="label">Название *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="IG / TG / Email…" />
        </div>
        <div className="form-row">
          <label className="label">Цвет тега</label>
          <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={saving}>
          {saving ? 'Создаём…' : '+ Создать тип'}
        </button>
      </div>

      <div className="settings-list">
        {actTypes.map(t => (
          <div key={t.id} className="settings-item" style={{ borderLeftColor: t.color }}>
            <span className="tag" style={{ background: t.color + '22', color: t.color, fontSize: 12 }}>{t.name}</span>
            <div className="settings-item-info" />
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(t.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activity Groups ──
function GroupsSection() {
  const { actGroups, projects, refresh } = useApp()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ name: '', color: randomColor(), date_from: today, date_to: today, project_id: '' })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await groupsApi.create({ ...form, project_id: form.project_id ? Number(form.project_id) : undefined })
    await refresh()
    setForm({ name: '', color: randomColor(), date_from: today, date_to: today, project_id: '' })
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Удалить группу?')) return
    await groupsApi.delete(id)
    await refresh()
  }

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Группы активностей</h2>
      <p className="settings-hint">Группы отображаются цветной полоской над колонками дней в календаре.</p>

      <div className="settings-form">
        <div className="form-row">
          <label className="label">Название *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название группы" />
        </div>
        <div className="form-cols-2">
          <div className="form-row">
            <label className="label">Начало</label>
            <input type="date" className="input" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div className="form-row">
            <label className="label">Конец</label>
            <input type="date" className="input" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <label className="label">Проект (опционально)</label>
          <select className="select" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
            <option value="">— без проекта —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="label">Цвет</label>
          <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={saving}>
          {saving ? 'Создаём…' : '+ Создать группу'}
        </button>
      </div>

      <div className="settings-list">
        {actGroups.map(g => (
          <div key={g.id} className="settings-item" style={{ borderLeftColor: g.color }}>
            <div className="settings-item-info">
              <div className="settings-item-name">{g.name}</div>
              <div className="settings-item-desc">
                {g.date_from.slice(8)}.{g.date_from.slice(5,7)} – {g.date_to.slice(8)}.{g.date_to.slice(5,7)}
                {g.project_name && ` · ${g.project_emoji} ${g.project_name}`}
              </div>
            </div>
            <div className="color-dot" style={{ background: g.color }} />
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(g.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Assignees ──
function AssigneesSection() {
  const { assignees, refresh } = useApp()
  const [form, setForm] = useState({ name: '', avatar_color: randomColor() })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await assigneesApi.create(form)
    await refresh()
    setForm({ name: '', avatar_color: randomColor() })
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Удалить исполнителя?')) return
    await assigneesApi.delete(id)
    await refresh()
  }

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Исполнители</h2>
      <p className="settings-hint">Добавляйте людей — их можно назначать ответственными за задачи.</p>

      <div className="settings-form">
        <div className="form-row">
          <label className="label">Имя *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Имя исполнителя" />
        </div>
        <div className="form-row">
          <label className="label">Цвет аватара</label>
          <ColorPicker value={form.avatar_color} onChange={c => setForm(f => ({ ...f, avatar_color: c }))} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={saving}>
          {saving ? 'Добавляем…' : '+ Добавить исполнителя'}
        </button>
      </div>

      <div className="settings-list">
        {assignees.map(a => (
          <div key={a.id} className="settings-item" style={{ borderLeftColor: a.avatar_color }}>
            <div
              className="assignee-avatar"
              style={{ background: a.avatar_color + '30', color: a.avatar_color }}
            >
              {a.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="settings-item-info">
              <div className="settings-item-name">{a.name}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(a.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  )
}
