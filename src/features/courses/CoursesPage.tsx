import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/Page'
import { formatDay } from '../../lib/dates'
import type { AcademicData, Course, Term } from '../../types/academic'
import { formatGrade } from '../grades/calculations'
import { courseError, removeCourse, removeTerm, termError, upsertById } from './academicActions'

type Editing = { kind: 'term'; item: Term } | { kind: 'course'; item: Course }

export function CoursesPage({ data, onUpdate, retainRemoved }: { data: AcademicData; onUpdate: (data: AcademicData) => void; retainRemoved?: boolean }) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [deleting, setDeleting] = useState<Editing | null>(null)
  const [error, setError] = useState('')

  function edit(item: Editing) {
    setEditing(item)
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name')).trim()
    if (editing.kind === 'term') {
      const term = { ...editing.item, name, start: String(fields.get('start')), end: String(fields.get('end')) }
      const message = termError(term)
      setError(message)
      if (message) return
      onUpdate({ ...data, terms: upsertById(data.terms, term) })
    } else {
      const course = {
        ...editing.item, name, color: String(fields.get('color')), target: Number(fields.get('target')),
        rounding: fields.get('rounding') === 'integer' ? 'integer' as const : 'none' as const,
      }
      const message = courseError(course)
      setError(message)
      if (message) return
      onUpdate({ ...data, courses: upsertById(data.courses, course) })
    }
    setEditing(null)
  }

  function confirmDeletion() {
    if (!deleting) return
    const updated = deleting.kind === 'term' ? removeTerm(data, deleting.item.id) : removeCourse(data, deleting.item.id)
    onUpdate(updated)
    if (editing && (editing.item.id === deleting.item.id ||
      (editing.kind === 'course' && deleting.kind === 'term' && editing.item.termId === deleting.item.id))) {
      setEditing(null)
    }
    setDeleting(null)
  }

  return (
    <Page title="Ciclos y cursos" description="Organiza tus cursos por ciclo académico.">
      <button className="button primary mt-6" onClick={() => edit({
        kind: 'term', item: { id: crypto.randomUUID(), name: '', start: '', end: '', archived: false },
      })}>Crear ciclo</button>

      {editing && <form key={editing.item.id} onSubmit={submit} className="panel mt-4 grid gap-3 sm:grid-cols-2">
        <h2 className="sm:col-span-2">{editing.kind === 'term' ? 'Datos del ciclo' : 'Datos del curso'}</h2>
        <label className="field sm:col-span-2">Nombre<input autoFocus name="name" required defaultValue={editing.item.name} /></label>
        {editing.kind === 'term' ? <>
          <label className="field">Fecha inicial<input type="date" name="start" defaultValue={editing.item.start} /></label>
          <label className="field">Fecha final<input type="date" name="end" defaultValue={editing.item.end} /></label>
        </> : <>
          <label className="field">Meta del curso<input name="target" type="number" min="0" max="20" step="any" required defaultValue={editing.item.target} /></label>
          <label className="field">Color<input name="color" type="color" defaultValue={editing.item.color} /></label>
          <label className="field sm:col-span-2">Redondeo para aprobación
            <select name="rounding" defaultValue={editing.item.rounding}>
              <option value="none">Sin redondeo</option>
              <option value="integer">Al entero más cercano</option>
            </select>
          </label>
        </>}
        {error && <p role="alert" className="error sm:col-span-2">{error}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="button primary">{editing.kind === 'term' ? 'Guardar ciclo' : 'Guardar curso'}</button>
          <button type="button" className="button" onClick={() => setEditing(null)}>Cancelar</button>
        </div>
      </form>}

      {deleting && <section className="panel mt-4" aria-label="Confirmar eliminación">
        <h2>Eliminar {deleting.item.name}</h2>
        <p className="mt-2">{retainRemoved
          ? 'Los registros se retirarán de tu vista y se conservarán en la base de datos. Las actividades vinculadas aparecerán como generales.'
          : deleting.kind === 'term'
          ? 'Se eliminarán el ciclo, sus cursos y sus evaluaciones. Las actividades vinculadas pasarán a ser generales.'
          : 'Se eliminarán el curso y sus evaluaciones. Las actividades vinculadas pasarán a ser generales.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="button danger" onClick={confirmDeletion}>Confirmar eliminación</button>
          <button className="button" onClick={() => setDeleting(null)}>Cancelar eliminación</button>
        </div>
      </section>}

      {data.terms.length === 0 && <p className="panel mt-4">Crea tu primer ciclo para organizar tus cursos.</p>}
      <div className="mt-4 space-y-4">
        {data.terms.map((term) => {
          const courses = data.courses.filter(({ termId }) => termId === term.id)
          return <section key={term.id} className="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words">{term.name}</h2>
                <p className="text-sm text-muted">
                  {[term.archived ? 'Archivado' : 'Activo', term.start && formatDay(term.start), term.end && formatDay(term.end)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!term.archived && <button className="button primary" onClick={() => edit({
                  kind: 'course', item: {
                    id: crypto.randomUUID(), termId: term.id, name: '', color: '#125846', target: data.defaultTarget,
                    rounding: 'none', nextAssessment: 1, assessments: [],
                  },
                })} aria-label={`Agregar curso a ${term.name}`}>Agregar curso</button>}
                <button className="button" aria-label={`Editar ciclo ${term.name}`} onClick={() => edit({ kind: 'term', item: term })}>Editar ciclo</button>
                <button className="button" onClick={() => onUpdate({
                  ...data, terms: upsertById(data.terms, { ...term, archived: !term.archived }),
                })}>{term.archived ? 'Reactivar ciclo' : 'Archivar ciclo'}</button>
                <button className="button danger" aria-label={`Eliminar ciclo ${term.name}`} onClick={() => setDeleting({ kind: 'term', item: term })}>Eliminar ciclo</button>
              </div>
            </div>
            {courses.length === 0 && <p className="mt-4 text-muted">Este ciclo aún no tiene cursos.</p>}
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {courses.map((course) => <li key={course.id} className="min-w-0 rounded-xl border border-line p-4" style={{ borderInlineStart: `4px solid ${course.color}` }}>
                <h3 className="break-words font-semibold">{course.name}</h3>
                <p className="mb-3 text-sm text-muted">Meta {formatGrade(course.target)}/20 · {course.assessments.length} evaluaciones</p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/notas?${new URLSearchParams({ curso: course.id })}`} className="button primary" aria-label={`Gestionar evaluaciones de ${course.name}`}>Evaluaciones</Link>
                  <button className="button" aria-label={`Editar curso ${course.name}`} onClick={() => edit({ kind: 'course', item: course })}>Editar</button>
                  <button className="button danger" aria-label={`Eliminar curso ${course.name}`} onClick={() => setDeleting({ kind: 'course', item: course })}>Eliminar</button>
                </div>
              </li>)}
            </ul>
          </section>
        })}
      </div>
    </Page>
  )
}
