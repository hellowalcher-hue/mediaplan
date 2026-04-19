// src/types/index.ts

export interface Project {
  id: number
  name: string
  description?: string
  emoji: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ActivityType {
  id: number
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface ActivityGroup {
  id: number
  name: string
  color: string
  date_from: string   // YYYY-MM-DD
  date_to: string
  project_id?: number
  project_name?: string
  project_emoji?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  title: string
  short_desc?: string
  comment?: string
  date_from?: string
  date_to?: string
  time_publish?: string   // HH:MM:SS
  show_time: boolean
  project_id?: number
  type_id?: number
  group_id?: number
  is_process: boolean
  status: 'active' | 'done' | 'cancelled'
  no_deadline: boolean
  deadline_scope?: 'week' | 'month' | 'none'
  sort_order: number
  created_at: string
  updated_at: string

  // Joined fields
  project_name?: string
  project_emoji?: string
  project_color?: string
  type_name?: string
  type_color?: string
  group_name?: string
  group_color?: string
  detail_description?: string
  detail_goal?: string
  detail_expected_result?: string
  detail_actual_result?: string
  tasks_count: number
  tasks_done_count: number
  has_details: boolean
}

export interface Assignee {
  id: number
  name: string
  avatar_color: string
  sort_order: number
  created_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export interface Task {
  id: number
  activity_id: number
  title: string
  description?: string
  assignee_id?: number
  deadline?: string
  status: TaskStatus
  sort_order: number
  created_at: string
  updated_at: string

  // Joined
  assignee_name?: string
  assignee_color?: string
  activity_title?: string
  activity_date?: string
  project_name?: string
  project_color?: string
  project_emoji?: string
}

// UI filters state
export interface CalendarFilters {
  projectIds: number[]
  typeIds: number[]
  groupIds: number[]
}

export interface DateRange {
  from: string   // YYYY-MM-DD
  to: string
}
