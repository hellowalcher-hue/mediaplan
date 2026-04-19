// src/services/api.ts

import type {
  Project, ActivityType, ActivityGroup, Activity, Task, Assignee, DateRange
} from '../types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

const get  = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const put  = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del  = (path: string) => request<{ ok: boolean }>(path, { method: 'DELETE' })

// ---- Projects ----
export const projectsApi = {
  list:   ()              => get<Project[]>('/projects'),
  create: (data: Partial<Project>) => post<Project>('/projects', data),
  update: (id: number, data: Partial<Project>) => put<Project>(`/projects/${id}`, data),
  delete: (id: number) => del(`/projects/${id}`),
}

// ---- Activity Types ----
export const typesApi = {
  list:   ()              => get<ActivityType[]>('/activity-types'),
  create: (data: Partial<ActivityType>) => post<ActivityType>('/activity-types', data),
  update: (id: number, data: Partial<ActivityType>) => put<ActivityType>(`/activity-types/${id}`, data),
  delete: (id: number) => del(`/activity-types/${id}`),
}

// ---- Activity Groups ----
export const groupsApi = {
  list: (range?: DateRange) => {
    const qs = range ? `?date_from=${range.from}&date_to=${range.to}` : ''
    return get<ActivityGroup[]>(`/activity-groups${qs}`)
  },
  create: (data: Partial<ActivityGroup>) => post<ActivityGroup>('/activity-groups', data),
  update: (id: number, data: Partial<ActivityGroup>) => put<ActivityGroup>(`/activity-groups/${id}`, data),
  delete: (id: number) => del(`/activity-groups/${id}`),
}

// ---- Activities ----
interface ActivityQuery {
  date_from?: string
  date_to?: string
  project_id?: number
  type_id?: number
  group_id?: number
  no_deadline?: 'week' | 'month' | 'none' | 'all'
}

export const activitiesApi = {
  list: (q: ActivityQuery = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return get<Activity[]>(`/activities${qs ? '?' + qs : ''}`)
  },
  get:    (id: number)   => get<Activity>(`/activities/${id}`),
  create: (data: Partial<Activity>) => post<Activity>('/activities', data),
  update: (id: number, data: Partial<Activity>) => patch<Activity>(`/activities/${id}`, data),
  delete: (id: number)   => del(`/activities/${id}`),
  setDone: (id: number, done: boolean) =>
    patch<Activity>(`/activities/${id}`, { status: done ? 'done' : 'active' }),
  move: (id: number, dateFrom: string, dateTo: string) =>
    patch<Activity>(`/activities/${id}`, { date_from: dateFrom, date_to: dateTo, no_deadline: 0 }),
}

// ---- Tasks ----
interface TaskQuery {
  activity_id?: number
  project_id?: number
  assignee_id?: number
  status?: string
}

export const tasksApi = {
  listAll:      (q: TaskQuery = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return get<Task[]>(`/tasks${qs ? '?' + qs : ''}`)
  },
  byActivity: (activityId: number) =>
    get<Task[]>(`/activities/${activityId}/tasks`),
  create: (activityId: number, data: Partial<Task>) =>
    post<Task>(`/activities/${activityId}/tasks`, data),
  update: (id: number, data: Partial<Task>) => patch<Task>(`/tasks/${id}`, data),
  delete: (id: number) => del(`/tasks/${id}`),
}

// ---- Assignees ----
export const assigneesApi = {
  list:   ()              => get<Assignee[]>('/assignees'),
  create: (data: Partial<Assignee>) => post<Assignee>('/assignees', data),
  update: (id: number, data: Partial<Assignee>) => put<Assignee>(`/assignees/${id}`, data),
  delete: (id: number) => del(`/assignees/${id}`),
}
