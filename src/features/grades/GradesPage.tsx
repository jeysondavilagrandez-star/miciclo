import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Page } from '../../components/Page'
import type { Assessment, Course } from '../../types/academic'
import { assessmentError, moveAssessment, saveAssessment, withSimulation } from './assessments'
import { calculateGrades, formatGrade, validGrade } from './calculations'
import { GradeSummary } from './GradeSummary'

export function GradesPage({ courses, onUpdate }: { courses: Course[]; onUpdate: (course: Course) => void }) {
  const [params, setParams] = useSearchParams()
  const course = courses.find(({ id }) => id === params.get('curso')) ?? courses[0]
  const assessment = course?.assessments.find(({ id }) => id === params.get('evaluacion'))
  return (
    <Page title="Notas" description="Gestiona tus evaluaciones y calcula qué necesitas para alcanzar tu meta.">
      {course ? <>
        <label className="field mt-6 max-w-md">Curso
          <select value={course.id} onChange={(event) => setParams({ curso: event.target.value })}>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <GradeEditor key={assessment?.id ?? course.id} course={course} initialAssessment={assessment} onUpdate={onUpdate} />
      </> : <p className="panel mt-6">Crea un curso en <Link className="text-link" to="/cursos">Ciclos y cursos</Link> para registrar evaluaciones.</p>}
    </Page>
  )
}

function GradeEditor({ course, initialAssessment, onUpdate }: { course: Course; initialAssessment?: Assessment; onUpdate: (course: Course) => void }) {
  const [editing, setEditing] = useState<Assessment | null>(initialAssessment ?? null)
  const [error, setError] = useState('')
  const [simulation, setSimulation] = useState(false)
  const [scenario, setScenario] = useState<Record<string, number>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [targetError, setTargetError] = useState('')
  const real = calculateGrades(course.assessments, course.target)
  const simulated = calculateGrades(withSimulation(course.assessments, scenario), course.target)

  function edit(assessment: Assessment) {
    setEditing(assessment)
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const data = new FormData(event.currentTarget)
    const grade = String(data.get('grade'))
    const time = String(data.get('time'))
    const assessment = {
      ...editing,
      name: String(data.get('name')).trim(),
      weight: Number(data.get('weight')),
      grade: grade === '' ? null : Number(grade),
      date: String(data.get('date')),
      time,
      timeZone: time ? (editing.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) : undefined,
    }
    const message = assessmentError(course, assessment)
    setError(message)
    if (message) return
    onUpdate(saveAssessment(course, assessment))
    setEditing(null)
  }

  function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = Number(new FormData(event.currentTarget).get('target'))
    if (!validGrade(target)) {
      setTargetError('La meta debe estar entre 0 y 20.')
      return
    }
    setTargetError('')
    onUpdate({ ...course, target })
  }

  return (
    <div className="mt-6 space-y-5">
      <form onSubmit={saveTarget} className="flex flex-wrap items-end gap-3">
        <label className="field">Meta del curso
          <input key={course.target} name="target" type="number" min="0" max="20" step="any" required defaultValue={course.target} />
        </label>
        <button className="button" type="submit">Guardar meta</button>
        {targetError && <p role="alert" className="error">{targetError}</p>}
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <GradeSummary title="Notas reales" summary={real} rounding={course.rounding} target={course.target} />
        {simulation && <GradeSummary title="Escenario simulado" summary={simulated} rounding={course.rounding} target={course.target} />}
      </div>
      {simulation && <p role="status">Diferencia de puntos acumulados: {formatGrade(simulated.points - real.points)}.</p>}
      <p className="text-sm text-muted">Las proyecciones usan el promedio ponderado. Los mínimos de examen y las reglas de sustitución quedan fuera del cálculo.</p>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Evaluaciones</h2>
          <div className="flex flex-wrap gap-2">
            <button className="button" aria-pressed={simulation} onClick={() => setSimulation(!simulation)}>Simular notas</button>
            {simulation && <button className="button" onClick={() => setScenario({})}>Restablecer escenario</button>}
            <button className="button primary" onClick={() => edit({
              id: crypto.randomUUID(), name: `Evaluación ${course.nextAssessment}`, weight: 0, grade: null, date: '', time: '',
            })}>Agregar evaluación</button>
          </div>
        </div>

        {editing && <form key={editing.id} onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-wash p-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">Nombre<input name="name" required defaultValue={editing.name} /></label>
          <label className="field">Peso (%)<input name="weight" type="number" min="0" max="100" step="0.01" required defaultValue={editing.weight} /></label>
          <label className="field">Nota real (opcional)<input name="grade" type="number" min="0" max="20" step="any" defaultValue={editing.grade ?? ''} /></label>
          <label className="field">Fecha<input name="date" type="date" defaultValue={editing.date} /></label>
          <label className="field">Hora<input name="time" type="time" defaultValue={editing.time} /></label>
          {error && <p role="alert" className="error sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="button primary">Guardar evaluación</button>
            <button type="button" className="button" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>}

        {course.assessments.length === 0 && <p className="mt-4 text-muted">Agrega la primera evaluación para configurar la distribución de notas.</p>}
        <ul className="divide-y divide-line">
          {course.assessments.map((entry, index) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={entry.id}>
              <div className="min-w-0 break-words">
                <h3 className="font-semibold">{entry.name}</h3>
                <p>{formatGrade(entry.weight)} % · {entry.grade === null ? 'Pendiente' : formatGrade(entry.grade)}{entry.date && ` · ${entry.date}`}</p>
              </div>
              {simulation && <label className="field">Nota simulada de {entry.name}
                <input type="number" min="0" max="20" step="any" value={scenario[entry.id] ?? ''}
                  placeholder={entry.grade === null ? 'Pendiente' : String(entry.grade)}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    if (value !== '' && !validGrade(Number(value))) return
                    setScenario((previous) => {
                      const next = { ...previous }
                      if (value === '') delete next[entry.id]
                      else next[entry.id] = Number(value)
                      return next
                    })
                  }} />
              </label>}
              {deleting === entry.id ? <div className="flex flex-wrap gap-2" role="group" aria-label={`Eliminar ${entry.name}`}>
                <button className="button danger" onClick={() => {
                  onUpdate({ ...course, assessments: course.assessments.filter(({ id }) => id !== entry.id) })
                  if (editing?.id === entry.id) setEditing(null)
                  setDeleting(null)
                }}>Confirmar eliminación</button>
                <button className="button" onClick={() => setDeleting(null)}>Cancelar</button>
              </div> : <div className="flex flex-wrap gap-2">
                <button className="button" onClick={() => edit(entry)} aria-label={`Editar ${entry.name}`}>Editar</button>
                <button className="button" disabled={index === 0} onClick={() => onUpdate(moveAssessment(course, entry.id, -1))} aria-label={`Subir ${entry.name}`}>↑</button>
                <button className="button" disabled={index === course.assessments.length - 1} onClick={() => onUpdate(moveAssessment(course, entry.id, 1))} aria-label={`Bajar ${entry.name}`}>↓</button>
                <button className="button danger" onClick={() => setDeleting(entry.id)} aria-label={`Eliminar ${entry.name}`}>Eliminar</button>
              </div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
