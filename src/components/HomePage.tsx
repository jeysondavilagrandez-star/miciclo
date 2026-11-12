import { Link } from 'react-router'
import { calendarEvents } from '../features/calendar/events'
import { civilToday, formatDay } from '../lib/dates'
import type { AcademicData } from '../types/academic'
import { Page } from './Page'

export function HomePage({ data }: { data: AcademicData }) {
  const courses = data.courses.filter(({ termId }) => data.terms.some((term) => term.id === termId && !term.archived))
  const assessments = courses.flatMap((course) => course.assessments)
  const today = civilToday()
  const activeCourseIds = new Set(courses.map(({ id }) => id))
  const upcoming = calendarEvents(data)
    .filter(({ date, course }) => date >= today && (!course || activeCourseIds.has(course.id)))
    .slice(0, 5)
  return (
    <Page title="Inicio" description="Consulta tus próximas fechas y el progreso de tus cursos.">
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <h2>Progreso académico</h2>
          <dl className="my-4 grid grid-cols-2 gap-3">
            <div><dt>Cursos activos</dt><dd>{courses.length}</dd></div>
            <div><dt>Evaluaciones calificadas</dt><dd>{assessments.filter(({ grade }) => grade !== null).length}/{assessments.length}</dd></div>
          </dl>
          <Link className="text-link" to="/cursos">Ver ciclos y cursos</Link>
        </section>
        <section className="panel">
          <h2>Próximas fechas</h2>
          {upcoming.length ? <ul className="my-4 divide-y divide-line">
            {upcoming.map((event) => <li className="break-words py-2" key={`${event.kind}:${event.id}`}>
              <p className="text-sm text-muted">{formatDay(event.date)}{event.course && ` · ${event.course.name}`}</p>
              <p className="font-semibold">{event.title}</p>
            </li>)}
          </ul> : <p className="my-4 text-muted">No hay próximos eventos.</p>}
          <Link className="text-link" to="/calendario">Abrir calendario</Link>
        </section>
      </div>
    </Page>
  )
}
