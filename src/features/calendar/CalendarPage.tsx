import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/Page'
import { civilToday, formatDay, formatMonth, monthDays, offsetMonth } from '../../lib/dates'
import type { AcademicData, Activity } from '../../types/academic'
import { assessmentLink, calendarEvents } from './events'

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function CalendarPage({ data, onUpdate }: { data: AcademicData; onUpdate: (activities: Activity[]) => void }) {
  const [day, setDay] = useState(civilToday)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [error, setError] = useState('')
  const today = civilToday()
  const month = day.slice(0, 7)
  const { leading, days } = monthDays(month)
  const events = calendarEvents(data)
  const agenda = events.filter((event) => event.date === day)
  const undated = events.filter((event) => !event.date)
  const upcoming = events.filter((event) => event.date > day).slice(0, 5)
  const counts = new Map<string, number>()
  const courses = data.courses.filter(({ id, termId }) => id === editing?.courseId || data.terms.some((term) => term.id === termId && !term.archived))
  for (const event of events) counts.set(event.date, (counts.get(event.date) ?? 0) + 1)

  function edit(activity: Activity) {
    setEditing(activity)
    setError('')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title')).trim()
    const date = String(fields.get('date'))
    const start = String(fields.get('start'))
    const end = String(fields.get('end'))
    const courseId = String(fields.get('courseId'))
    const message = !title ? 'Escribe un título.'
      : (start || end) && !date ? 'Selecciona una fecha para indicar horas.'
        : start && end && start > end ? 'La hora de fin debe ser igual o posterior al inicio.'
          : courseId && !courses.some(({ id }) => id === courseId) ? 'Selecciona un curso activo.' : ''
    setError(message)
    if (message) return
    const activity = {
      ...editing, title, date, start, end, courseId,
      timeZone: start || end ? (editing.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) : undefined,
      description: String(fields.get('description')).trim(),
    }
    onUpdate(data.activities.some(({ id }) => id === activity.id)
      ? data.activities.map((item) => item.id === activity.id ? activity : item)
      : [...data.activities, activity])
    if (date) setDay(date)
    setEditing(null)
  }

  return (
    <Page title="Calendario" description="Consulta las fechas de tus evaluaciones y actividades.">
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="panel" aria-label="Calendario mensual">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="capitalize" aria-live="polite">{formatMonth(month)}</h2>
            <div className="flex gap-1">
              <button className="button" onClick={() => setDay(`${offsetMonth(month, -1)}-01`)} aria-label="Mes anterior">‹</button>
              <button className="button" onClick={() => setDay(today)}>Hoy</button>
              <button className="button" onClick={() => setDay(`${offsetMonth(month, 1)}-01`)} aria-label="Mes siguiente">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((name) => <abbr key={name} title={name} className="py-1 text-xs no-underline">{name.slice(0, 2)}</abbr>)}
            {Array.from({ length: leading }, (_, index) => <span key={index} aria-hidden="true" />)}
            {days.map((date) => {
              const count = counts.get(date) ?? 0
              return <button key={date} aria-pressed={day === date} aria-current={date === today ? 'date' : undefined}
                aria-label={`${formatDay(date)}, ${count} eventos`} onClick={() => setDay(date)}
                className="grid min-h-11 place-content-center rounded-lg text-sm tabular-nums hover:bg-wash aria-pressed:bg-brand aria-pressed:text-white">
                {Number(date.slice(-2))}
                {count > 0 && <span aria-hidden="true" className="text-xs font-semibold">· {count}</span>}
              </button>
            })}
          </div>
        </section>

        <section className="panel space-y-4" aria-label="Agenda">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2>{formatDay(day)}</h2>
            <button className="button primary" onClick={() => edit({
              id: crypto.randomUUID(), title: '', date: day, start: '', end: '', courseId: '', description: '', done: false,
            })}>Agregar actividad</button>
          </div>

          {editing && <form key={editing.id} onSubmit={save} className="grid gap-3 rounded-xl bg-wash p-3">
            <label className="field">Título<input name="title" required defaultValue={editing.title} /></label>
            <label className="field">Fecha<input name="date" type="date" defaultValue={editing.date} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="field">Inicio<input name="start" type="time" defaultValue={editing.start} /></label>
              <label className="field">Fin<input name="end" type="time" defaultValue={editing.end} /></label>
            </div>
            <label className="field">Curso<select name="courseId" defaultValue={editing.courseId}>
              <option value="">General</option>
              {courses.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select></label>
            <label className="field">Descripción<textarea name="description" defaultValue={editing.description} /></label>
            {error && <p role="alert" className="error">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="button primary">Guardar actividad</button>
              <button type="button" className="button" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </form>}

          {agenda.length === 0 && <p className="text-muted">No hay eventos para esta fecha.</p>}
          {undated.length > 0 && <h3 className="font-semibold">Actividades sin fecha</h3>}
          {[...undated, ...agenda].map((event) => (
            <div className="border-b border-line pb-3 last:border-b-0" key={`${event.kind}:${event.id}`}>
              <p className="text-sm text-muted">{event.kind === 'assessment' ? 'Evaluación' : 'Actividad'}{event.course && ` · ${event.course.name}`}</p>
              <h3 className="break-words font-semibold">{event.title}</h3>
              {event.kind === 'assessment' ? <>
                {event.time && <p>{event.time} · {event.assessment.timeZone}</p>}
                <Link className="text-link" to={assessmentLink(event)}>Editar en Notas</Link>
              </> : <>
                {(event.activity.start || event.activity.end) && <p>{[event.activity.start, event.activity.end].filter(Boolean).join(' – ')} · {event.activity.timeZone}</p>}
                {event.activity.description && <p className="break-words">{event.activity.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="button" onClick={() => edit(event.activity)}>Editar</button>
                  <button className="button" aria-pressed={event.activity.done} onClick={() => onUpdate(data.activities.map((item) =>
                    item.id === event.id ? { ...item, done: !item.done } : item))}>
                    {event.activity.done ? 'Completada' : 'Marcar completada'}
                  </button>
                </div>
              </>}
            </div>
          ))}
          {upcoming.length > 0 && <div>
            <h3 className="font-semibold">Próximos eventos</h3>
            <ul className="mt-2 space-y-2">
              {upcoming.map((event) => <li key={`${event.kind}:${event.id}`}><button className="text-link text-left" onClick={() => setDay(event.date)}>
                {formatDay(event.date)} · {event.title}
              </button></li>)}
            </ul>
          </div>}
        </section>
      </div>
    </Page>
  )
}
