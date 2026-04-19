// src/contexts/AppContext.tsx

import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback
} from 'react'
import type { Project, ActivityType, ActivityGroup, Activity, Assignee, DateRange, CalendarFilters } from '../types'
import { projectsApi, typesApi, groupsApi, activitiesApi, assigneesApi } from '../services/api'
import { startOfWeek, endOfWeek, formatDate } from '../utils/date'

interface AppState {
  projects:    Project[]
  actTypes:    ActivityType[]
  actGroups:   ActivityGroup[]
  activities:  Activity[]
  noDeadlineActivities: Activity[]
  assignees:   Assignee[]
  dateRange:   DateRange
  filters:     CalendarFilters
  loading:     boolean
  error:       string | null
}

interface AppActions {
  setDateRange: (r: DateRange) => void
  setFilters:   (f: Partial<CalendarFilters>) => void
  refresh:      () => void
  refreshActivities: () => void
  // CRUD helpers that update local state immediately (optimistic)
  updateActivity: (id: number, data: Partial<Activity>) => Promise<void>
  deleteActivity: (id: number) => Promise<void>
}

const AppContext = createContext<(AppState & AppActions) | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const today = new Date()
  const [dateRange, setDateRangeState] = useState<DateRange>({
    from: formatDate(startOfWeek(today)),
    to:   formatDate(endOfWeek(today)),
  })
  const [filters, setFiltersState] = useState<CalendarFilters>({
    projectIds: [],
    typeIds:    [],
    groupIds:   [],
  })

  const [projects,   setProjects]   = useState<Project[]>([])
  const [actTypes,   setActTypes]   = useState<ActivityType[]>([])
  const [actGroups,  setActGroups]  = useState<ActivityGroup[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [noDeadlineActivities, setNoDeadline] = useState<Activity[]>([])
  const [assignees,  setAssignees]  = useState<Assignee[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load static entities once
  const loadStatic = useCallback(async () => {
    const [p, t, a] = await Promise.all([
      projectsApi.list(),
      typesApi.list(),
      assigneesApi.list(),
    ])
    setProjects(p)
    setActTypes(t)
    setAssignees(a)
  }, [])

  // Load calendar data (changes with dateRange / filters)
  const loadCalendar = useCallback(async () => {
    try {
      const [groups, acts, noDeadline] = await Promise.all([
        groupsApi.list(dateRange),
        activitiesApi.list({
          date_from:  dateRange.from,
          date_to:    dateRange.to,
          ...(filters.projectIds.length === 1 ? { project_id: filters.projectIds[0] } : {}),
          ...(filters.typeIds.length    === 1 ? { type_id:    filters.typeIds[0]    } : {}),
          ...(filters.groupIds.length   === 1 ? { group_id:   filters.groupIds[0]   } : {}),
        }),
        activitiesApi.list({ no_deadline: 'all' }),
      ])
      setActGroups(groups)

      // Client-side filter for multiple selections
      const filtered = acts.filter(a => {
        if (filters.projectIds.length > 1 && !filters.projectIds.includes(a.project_id!)) return false
        if (filters.typeIds.length    > 1 && !filters.typeIds.includes(a.type_id!))       return false
        if (filters.groupIds.length   > 1 && !filters.groupIds.includes(a.group_id!))     return false
        return true
      })
      setActivities(filtered)
      setNoDeadline(noDeadline)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    }
  }, [dateRange, filters])

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadStatic(), loadCalendar()])
    setLoading(false)
  }, [loadStatic, loadCalendar])

  const refreshActivities = useCallback(async () => {
    await loadCalendar()
  }, [loadCalendar])

  // Initial load
  useEffect(() => { refresh() }, [])  // eslint-disable-line

  // Reload calendar when range/filters change
  useEffect(() => { loadCalendar() }, [dateRange, filters])  // eslint-disable-line

  // Polling every 30s
  useEffect(() => {
    pollingRef.current = setInterval(() => { loadCalendar() }, 30_000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [loadCalendar])

  const setDateRange = useCallback((r: DateRange) => setDateRangeState(r), [])

  const setFilters = useCallback((f: Partial<CalendarFilters>) => {
    setFiltersState(prev => ({ ...prev, ...f }))
  }, [])

  const updateActivity = useCallback(async (id: number, data: Partial<Activity>) => {
    const updated = await activitiesApi.update(id, data)
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    setNoDeadline(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
  }, [])

  const deleteActivity = useCallback(async (id: number) => {
    await activitiesApi.delete(id)
    setActivities(prev => prev.filter(a => a.id !== id))
    setNoDeadline(prev => prev.filter(a => a.id !== id))
  }, [])

  return (
    <AppContext.Provider value={{
      projects, actTypes, actGroups, activities, noDeadlineActivities,
      assignees, dateRange, filters, loading, error,
      setDateRange, setFilters, refresh, refreshActivities,
      updateActivity, deleteActivity,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
