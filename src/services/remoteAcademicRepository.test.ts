import { describe, expect, it } from 'vitest'
import { removeTerm } from '../features/courses/academicActions'
import { demoData } from './demo'
import { academicChanges, copyForImport, isRevisionConflict } from './remoteAcademicRepository'

describe('adaptador académico remoto', () => {
  it('envía solo los cambios y conserva las evaluaciones con nota cero', () => {
    const previous = demoData()
    const next = structuredClone(previous)
    next.courses[0].assessments[3].grade = 0

    expect(academicChanges(previous, next)).toMatchObject({
      terms: [], courses: [], activities: [], removeAssessments: [],
      assessments: [{ id: 'demo-4', course_id: 'demo-course', grade: 0, position: 3 }],
    })
  })

  it('limita una baja de ciclo a los registros relacionados y conserva las actividades', () => {
    const previous = demoData()
    previous.activities.push({
      id: 'activity', title: 'Repaso', courseId: 'demo-course', date: '', start: '', end: '', description: '', done: false,
    })

    const changes = academicChanges(previous, removeTerm(previous, 'demo-term'))
    expect(changes.removeTerms).toEqual(['demo-term'])
    expect(changes.removeCourses).toEqual(['demo-course'])
    expect(changes.removeAssessments).toHaveLength(4)
    expect(changes.removeActivities).toEqual([])
    expect(changes.activities).toMatchObject([{ id: 'activity', course_id: null }])
  })

  it('copia las relaciones con IDs nuevos y deja la fuente intacta', () => {
    const local = demoData()
    const before = JSON.stringify(local)
    const imported = copyForImport(local)

    expect(imported.terms[0].id).not.toBe(local.terms[0].id)
    expect(imported.courses[0].termId).toBe(imported.terms[0].id)
    expect(imported.courses[0].assessments[0].id).not.toBe(local.courses[0].assessments[0].id)
    expect(JSON.stringify(local)).toBe(before)
  })

  it('reconoce un conflicto y permite distinguirlo de un error de conexión', () => {
    expect(isRevisionConflict({ code: '40001' })).toBe(true)
    expect(isRevisionConflict(new TypeError('fetch'))).toBe(false)
  })
})
