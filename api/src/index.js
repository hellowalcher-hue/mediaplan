// src/index.js
import express from 'express'
import cors from 'cors'
import { db, initSchema } from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8080

// ============================================
// Helpers
// ============================================
const ok = (res, data) => res.json(data)
const notFound = res => res.status(404).json({ error: 'Not found' })
const bad = (res, msg) => res.status(400).json({ error: msg })

function buildUpdate(fields, body) {
  const sets = [], vals = []
  for (const f of fields) {
    if (f in body) {
      sets.push(`${f} = ?`)
      vals.push(body[f])
    }
  }
  return { sets, vals }
}

// ============================================
// PROJECTS
// ============================================
app.get('/projects', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM projects ORDER BY sort_order, id')
  ok(res, rows)
})

app.get('/projects/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id])
  rows[0] ? ok(res, rows[0]) : notFound(res)
})

app.post('/projects', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    'INSERT INTO projects (name, description, emoji, color, sort_order) VALUES (?, ?, ?, ?, ?)',
    [b.name || '', b.description || null, b.emoji || '📁', b.color || '#378ADD', b.sort_order || 0]
  )
  const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [r.insertId])
  ok(res, rows[0])
})

app.put('/projects/:id', updateProject)
app.patch('/projects/:id', updateProject)
async function updateProject(req, res) {
  const { sets, vals } = buildUpdate(['name','description','emoji','color','sort_order'], req.body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id])
  ok(res, rows[0])
}

app.delete('/projects/:id', async (req, res) => {
  await db.query('DELETE FROM projects WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

// ============================================
// ACTIVITY TYPES
// ============================================
app.get('/activity-types', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM activity_types ORDER BY sort_order, id')
  ok(res, rows)
})

app.post('/activity-types', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    'INSERT INTO activity_types (name, color, sort_order) VALUES (?, ?, ?)',
    [b.name || '', b.color || '#378ADD', b.sort_order || 0]
  )
  const [rows] = await db.query('SELECT * FROM activity_types WHERE id = ?', [r.insertId])
  ok(res, rows[0])
})

app.put('/activity-types/:id', updateType)
app.patch('/activity-types/:id', updateType)
async function updateType(req, res) {
  const { sets, vals } = buildUpdate(['name','color','sort_order'], req.body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE activity_types SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await db.query('SELECT * FROM activity_types WHERE id = ?', [req.params.id])
  ok(res, rows[0])
}

app.delete('/activity-types/:id', async (req, res) => {
  await db.query('DELETE FROM activity_types WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

// ============================================
// ACTIVITY GROUPS
// ============================================
app.get('/activity-groups', async (req, res) => {
  let sql = `SELECT ag.*, p.name AS project_name, p.emoji AS project_emoji
             FROM activity_groups ag LEFT JOIN projects p ON p.id = ag.project_id
             WHERE 1=1`
  const params = []
  if (req.query.date_from && req.query.date_to) {
    sql += ' AND ag.date_from <= ? AND ag.date_to >= ?'
    params.push(req.query.date_to, req.query.date_from)
  }
  sql += ' ORDER BY ag.date_from, ag.sort_order'
  const [rows] = await db.query(sql, params)
  ok(res, rows)
})

app.post('/activity-groups', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    `INSERT INTO activity_groups (name, color, date_from, date_to, project_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [b.name || '', b.color || '#E8593C', b.date_from || null, b.date_to || null,
     b.project_id || null, b.sort_order || 0]
  )
  const [rows] = await db.query('SELECT * FROM activity_groups WHERE id = ?', [r.insertId])
  ok(res, rows[0])
})

app.put('/activity-groups/:id', updateGroup)
app.patch('/activity-groups/:id', updateGroup)
async function updateGroup(req, res) {
  const { sets, vals } = buildUpdate(['name','color','date_from','date_to','project_id','sort_order'], req.body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE activity_groups SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await db.query('SELECT * FROM activity_groups WHERE id = ?', [req.params.id])
  ok(res, rows[0])
}

app.delete('/activity-groups/:id', async (req, res) => {
  await db.query('DELETE FROM activity_groups WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

// ============================================
// ACTIVITIES
// ============================================
const ACTIVITY_SELECT = `
  SELECT a.*,
    p.name AS project_name, p.emoji AS project_emoji, p.color AS project_color,
    t.name AS type_name, t.color AS type_color,
    g.name AS group_name, g.color AS group_color,
    ad.description AS detail_description, ad.goal AS detail_goal,
    ad.expected_result AS detail_expected_result, ad.actual_result AS detail_actual_result,
    (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id) AS tasks_count,
    (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id AND tk.status='done') AS tasks_done_count,
    (ad.id IS NOT NULL AND (ad.description IS NOT NULL OR ad.goal IS NOT NULL)) AS has_details
  FROM activities a
  LEFT JOIN projects p ON p.id = a.project_id
  LEFT JOIN activity_types t ON t.id = a.type_id
  LEFT JOIN activity_groups g ON g.id = a.group_id
  LEFT JOIN activity_details ad ON ad.activity_id = a.id
`

function castActivity(a) {
  return {
    ...a,
    is_process:       !!a.is_process,
    no_deadline:      !!a.no_deadline,
    show_time:        !!a.show_time,
    has_details:      !!a.has_details,
    tasks_count:      +a.tasks_count,
    tasks_done_count: +a.tasks_done_count,
  }
}

app.get('/activities', async (req, res) => {
  let sql = ACTIVITY_SELECT + ' WHERE 1=1'
  const params = []
  const q = req.query

  if (q.no_deadline !== undefined) {
    sql += ' AND a.no_deadline = 1'
    if (q.no_deadline !== 'all') {
      sql += ' AND a.deadline_scope = ?'
      params.push(q.no_deadline)
    }
  } else if (q.date_from && q.date_to) {
    sql += ` AND ((a.date_from IS NULL AND a.date_to IS NULL)
            OR (a.date_from <= ? AND (a.date_to IS NULL OR a.date_to >= ?)))
            AND a.no_deadline = 0`
    params.push(q.date_to, q.date_from)
  }
  if (q.project_id) { sql += ' AND a.project_id = ?'; params.push(q.project_id) }
  if (q.type_id)    { sql += ' AND a.type_id = ?';    params.push(q.type_id) }
  if (q.group_id)   { sql += ' AND a.group_id = ?';   params.push(q.group_id) }

  sql += ' ORDER BY a.date_from, a.sort_order, a.id'
  const [rows] = await db.query(sql, params)
  ok(res, rows.map(castActivity))
})

app.get('/activities/:id', async (req, res) => {
  const [rows] = await db.query(ACTIVITY_SELECT + ' WHERE a.id = ?', [req.params.id])
  rows[0] ? ok(res, castActivity(rows[0])) : notFound(res)
})

app.post('/activities', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    `INSERT INTO activities
     (title, short_desc, comment, date_from, date_to, time_publish, show_time,
      project_id, type_id, group_id, is_process, status, no_deadline, deadline_scope, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.title || '', b.short_desc || null, b.comment || null,
     b.date_from || null, b.date_to || null, b.time_publish || null, b.show_time ? 1 : 0,
     b.project_id || null, b.type_id || null, b.group_id || null,
     b.is_process ? 1 : 0, b.status || 'active', b.no_deadline ? 1 : 0,
     b.deadline_scope || null, b.sort_order || 0]
  )
  await upsertDetails(r.insertId, b)
  const [rows] = await db.query(ACTIVITY_SELECT + ' WHERE a.id = ?', [r.insertId])
  ok(res, castActivity(rows[0]))
})

app.put('/activities/:id', updateActivity)
app.patch('/activities/:id', updateActivity)
async function updateActivity(req, res) {
  const allowed = ['title','short_desc','comment','date_from','date_to','time_publish','show_time',
                   'project_id','type_id','group_id','is_process','status','no_deadline','deadline_scope','sort_order']
  const body = { ...req.body }
  // Convert booleans to int
  for (const f of ['show_time','is_process','no_deadline']) {
    if (f in body) body[f] = body[f] ? 1 : 0
  }
  const { sets, vals } = buildUpdate(allowed, body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  await upsertDetails(+req.params.id, req.body)
  const [rows] = await db.query(ACTIVITY_SELECT + ' WHERE a.id = ?', [req.params.id])
  rows[0] ? ok(res, castActivity(rows[0])) : notFound(res)
}

app.delete('/activities/:id', async (req, res) => {
  await db.query('DELETE FROM activities WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

async function upsertDetails(activityId, body) {
  const fields = ['description','goal','expected_result','actual_result']
  const hasAny = fields.some(f => `detail_${f}` in body)
  if (!hasAny) return
  await db.query(
    `INSERT INTO activity_details (activity_id, description, goal, expected_result, actual_result)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       description=VALUES(description),
       goal=VALUES(goal),
       expected_result=VALUES(expected_result),
       actual_result=VALUES(actual_result)`,
    [activityId, body.detail_description || null, body.detail_goal || null,
     body.detail_expected_result || null, body.detail_actual_result || null]
  )
}

// ============================================
// TASKS
// ============================================
const TASK_SELECT = `
  SELECT tk.*,
    a.title AS activity_title, a.date_from AS activity_date,
    p.name AS project_name, p.color AS project_color, p.emoji AS project_emoji,
    asgn.name AS assignee_name, asgn.avatar_color AS assignee_color
  FROM tasks tk
  LEFT JOIN activities a ON a.id = tk.activity_id
  LEFT JOIN projects p ON p.id = a.project_id
  LEFT JOIN assignees asgn ON asgn.id = tk.assignee_id
`

app.get('/tasks', async (req, res) => {
  let sql = TASK_SELECT + ' WHERE 1=1'
  const params = []
  if (req.query.activity_id) { sql += ' AND tk.activity_id = ?'; params.push(req.query.activity_id) }
  if (req.query.project_id)  { sql += ' AND a.project_id = ?';  params.push(req.query.project_id) }
  if (req.query.assignee_id) { sql += ' AND tk.assignee_id = ?'; params.push(req.query.assignee_id) }
  if (req.query.status)      { sql += ' AND tk.status = ?';      params.push(req.query.status) }
  sql += ' ORDER BY tk.deadline, tk.sort_order, tk.id'
  const [rows] = await db.query(sql, params)
  ok(res, rows)
})

app.get('/activities/:id/tasks', async (req, res) => {
  const [rows] = await db.query(
    `SELECT tk.*, asgn.name AS assignee_name, asgn.avatar_color AS assignee_color
     FROM tasks tk LEFT JOIN assignees asgn ON asgn.id = tk.assignee_id
     WHERE tk.activity_id = ? ORDER BY tk.sort_order, tk.id`,
    [req.params.id]
  )
  ok(res, rows)
})

app.post('/activities/:id/tasks', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    `INSERT INTO tasks (activity_id, title, description, assignee_id, deadline, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.params.id, b.title || '', b.description || null, b.assignee_id || null,
     b.deadline || null, b.status || 'todo', b.sort_order || 0]
  )
  const [rows] = await db.query(TASK_SELECT + ' WHERE tk.id = ?', [r.insertId])
  ok(res, rows[0])
})

app.post('/tasks', async (req, res) => {
  const b = req.body
  if (!b.activity_id) return bad(res, 'activity_id required')
  const [r] = await db.query(
    `INSERT INTO tasks (activity_id, title, description, assignee_id, deadline, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [b.activity_id, b.title || '', b.description || null, b.assignee_id || null,
     b.deadline || null, b.status || 'todo', b.sort_order || 0]
  )
  const [rows] = await db.query(TASK_SELECT + ' WHERE tk.id = ?', [r.insertId])
  ok(res, rows[0])
})

app.put('/tasks/:id', updateTask)
app.patch('/tasks/:id', updateTask)
async function updateTask(req, res) {
  const { sets, vals } = buildUpdate(['title','description','assignee_id','deadline','status','sort_order'], req.body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await db.query(TASK_SELECT + ' WHERE tk.id = ?', [req.params.id])
  rows[0] ? ok(res, rows[0]) : notFound(res)
}

app.delete('/tasks/:id', async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

// ============================================
// ASSIGNEES
// ============================================
app.get('/assignees', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM assignees ORDER BY sort_order, name')
  ok(res, rows)
})

app.post('/assignees', async (req, res) => {
  const b = req.body
  const [r] = await db.query(
    'INSERT INTO assignees (name, avatar_color, sort_order) VALUES (?, ?, ?)',
    [b.name || '', b.avatar_color || '#7F77DD', b.sort_order || 0]
  )
  const [rows] = await db.query('SELECT * FROM assignees WHERE id = ?', [r.insertId])
  ok(res, rows[0])
})

app.put('/assignees/:id', updateAssignee)
app.patch('/assignees/:id', updateAssignee)
async function updateAssignee(req, res) {
  const { sets, vals } = buildUpdate(['name','avatar_color','sort_order'], req.body)
  if (sets.length) {
    vals.push(req.params.id)
    await db.query(`UPDATE assignees SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await db.query('SELECT * FROM assignees WHERE id = ?', [req.params.id])
  ok(res, rows[0])
}

app.delete('/assignees/:id', async (req, res) => {
  await db.query('DELETE FROM assignees WHERE id = ?', [req.params.id])
  ok(res, { ok: true })
})

// Health check
app.get('/', (req, res) => ok(res, { status: 'ok', service: 'mediaplan-api' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

// ============================================
// Startup
// ============================================
initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ API running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to init schema:', err)
    process.exit(1)
  })
