import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { monthDays, offsetMonth } from '../../lib/dates'
import { demoData } from '../../services/demo'
import { saveAssessment } from '../grades/assessments'
import { GradesPage } from '../grades/GradesPage'
import { calculateGrades } from '../grades/calculations'
import { assessmentLink, calendarEvents } from './events'

describe('integración de calendario y notas', () => {
  it('refleja un cambio de nombre y fecha desde Notas en un solo evento', () => {
    const data = demoData()
    const course = data.courses[0]
    const assessment = { ...course.assessments[0], date: '2026-11-15', time: '14:00', timeZone: 'America/Lima' }
    data.courses = [saveAssessment(course, assessment)]
    expect(calendarEvents(data)).toMatchObject([{ title: 'Evaluación 1', date: '2026-11-15' }])
    data.courses = [saveAssessment(data.courses[0], { ...assessment, name: 'Control', date: '2026-12-01' })]
    const events = calendarEvents(data)
    expect(events).toMatchObject([{ title: 'Control', date: '2026-12-01' }])
    const [event] = events
    if (event.kind !== 'assessment') throw new Error('Se esperaba una evaluación')
    const notes = renderToStaticMarkup(<MemoryRouter initialEntries={[assessmentLink(event)]}>
      <GradesPage courses={data.courses} onUpdate={() => {}} />
    </MemoryRouter>)
    expect(notes).toContain('value="Control"')
    expect(notes).toContain('value="2026-12-01"')
    data.courses = [saveAssessment(data.courses[0], { ...assessment, date: '', time: '' })]
    expect(calendarEvents(data)).toEqual([])
  })

  it('conserva una actividad independiente del cálculo, aunque comparta fecha y nombre', () => {
    const data = demoData()
    const course = data.courses[0]
    course.assessments[0].date = '2026-11-15'
    const before = calculateGrades(course.assessments, course.target)
    data.activities.push({
      id: 'activity', title: course.assessments[0].name, date: '2026-11-15',
      courseId: course.id, done: true, start: '', end: '', description: '',
    })
    expect(calendarEvents(data).map(({ kind }) => kind).sort()).toEqual(['activity', 'assessment'])
    expect(calculateGrades(course.assessments, course.target)).toEqual(before)
  })

  it('mantiene los eventos de ciclos archivados en la agenda histórica', () => {
    const data = demoData()
    data.terms[0].archived = true
    data.courses[0].assessments[0].date = '2026-11-15'
    expect(calendarEvents(data)).toMatchObject([{ title: 'Evaluación 1', date: '2026-11-15' }])
  })

  it('navega entre años y calcula febrero bisiesto con semanas de lunes a domingo', () => {
    expect(offsetMonth('2026-12', 1)).toBe('2027-01')
    expect(offsetMonth('2027-01', -1)).toBe('2026-12')
    expect(monthDays('2024-02')).toMatchObject({ leading: 3 })
    expect(monthDays('2024-02').days.at(-1)).toBe('2024-02-29')
    expect(monthDays('2026-02').days).toHaveLength(28)
  })
})
