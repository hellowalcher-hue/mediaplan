// src/utils/date.ts

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfWeek(d: Date): Date {
  const clone = new Date(d)
  const day = clone.getDay()
  // Monday = 0 offset, Sunday = -6
  const diff = day === 0 ? -6 : 1 - day
  clone.setDate(clone.getDate() + diff)
  clone.setHours(0, 0, 0, 0)
  return clone
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

export function addDays(d: Date, n: number): Date {
  const clone = new Date(d)
  clone.setDate(clone.getDate() + n)
  return clone
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

export function isInRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to
}

/** Returns array of dates from start to end inclusive */
export function daysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = []
  const cur = new Date(from)
  while (cur <= to) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export const RU_DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const RU_DAYS_FULL  = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
export const RU_MONTHS     = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
]
export const RU_MONTHS_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'
]

export function formatRu(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS_GEN[d.getMonth()]}`
}

export function dayLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}
