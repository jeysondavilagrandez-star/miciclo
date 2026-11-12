const dateLabel = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function civilToday(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDay(day: string) {
  return dateLabel.format(new Date(`${day}T00:00:00Z`))
}

export function formatMonth(month: string) {
  return monthLabel.format(new Date(`${month}-01T00:00:00Z`))
}

export function offsetMonth(month: string, offset: number) {
  const first = new Date(`${month}-01T00:00:00Z`)
  first.setUTCMonth(first.getUTCMonth() + offset)
  return first.toISOString().slice(0, 7)
}

export function monthDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`)
  const last = new Date(`${offsetMonth(month, 1)}-01T00:00:00Z`)
  last.setUTCDate(0)
  return {
    leading: (first.getUTCDay() + 6) % 7,
    days: Array.from({ length: last.getUTCDate() }, (_, index) =>
      `${month}-${String(index + 1).padStart(2, '0')}`),
  }
}
