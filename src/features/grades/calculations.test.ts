import { describe, expect, it } from 'vitest'
import { demoData } from '../../services/demo'
import { assessmentError, moveAssessment, saveAssessment, withSimulation } from './assessments'
import { calculateGrades, formatGrade } from './calculations'

describe('cálculo de calificaciones', () => {
  it('reproduce los resultados de la especificación para metas 11 y 15', () => {
    const { assessments } = demoData().courses[0]
    const summary = calculateGrades(assessments, 11)
    expect(summary.points).toBe(10.25)
    expect(summary.evaluated).toBe(70)
    expect(summary.average).toBeCloseTo(14.642857, 6)
    expect(summary.projection).toMatchObject({ remaining: 30, maximum: 16.25, required: 2.5, status: 'possible' })
    expect(calculateGrades(assessments, 15).projection?.required).toBeCloseTo(15.833333, 6)
  })

  it('distingue el cero de una evaluación pendiente', () => {
    expect(calculateGrades([{ weight: 100, grade: null }], 11)).toMatchObject({
      evaluated: 0, average: null, projection: { required: 11 },
    })
    expect(calculateGrades([{ weight: 100, grade: 0 }], 11)).toMatchObject({
      evaluated: 100, average: 0, projection: { required: null, status: 'missed' },
    })
  })

  it.each([99.99, 100.01])('omite la proyección con una distribución de %s', (total) => {
    expect(calculateGrades([{ weight: 50, grade: 10 }, { weight: total - 50, grade: null }].map(
      (entry) => ({ ...entry, weight: Number(entry.weight.toFixed(2)) }),
    ), 11).projection).toBeNull()
  })

  it('suma ponderaciones decimales sin desvío de coma flotante', () => {
    const summary = calculateGrades(Array.from({ length: 1000 }, () => ({ weight: 0.1, grade: 20 })), 20)
    expect(summary.weight).toBe(100)
    expect(summary.projection).toMatchObject({ remaining: 0, maximum: 20, status: 'reached' })
  })

  it.each([[20, 70, 'secured'], [5, 50, 'impossible'], [20, 100, 'reached']])(
    'clasifica una nota %s con peso %s como %s',
    (grade, weight, status) => {
      expect(calculateGrades([{ weight, grade }, { weight: 100 - weight, grade: null }], 14).projection?.status).toBe(status)
    },
  )

  it.each([
    { weight: -1, grade: 10 }, { weight: 100.01, grade: 10 }, { weight: 0.001, grade: 10 },
    { weight: 20, grade: 21 }, { weight: 20, grade: -1 }, { weight: 20, grade: NaN },
  ])('rechaza entradas inválidas: %j', (entry) => {
    expect(() => calculateGrades([entry], 11)).toThrow(RangeError)
  })

  it('redondea solo para visualizar', () => {
    const value = calculateGrades(demoData().courses[0].assessments, 11).average!
    expect(value).not.toBe(14.64)
    expect(Number(formatGrade(value).replace(',', '.'))).toBe(14.64)
  })
})

describe('gestión de evaluaciones', () => {
  it('valida la suma, conserva el correlativo y admite ordenar', () => {
    const course = demoData().courses[0]
    const entry = { id: 'fifth', name: 'Evaluación 5', weight: 1, grade: null, date: '', time: '' }
    expect(assessmentError(course, entry)).toContain('superar 100')
    const draft = { ...course, assessments: course.assessments.slice(0, 3) }
    const withFifth = saveAssessment(draft, entry)
    const renamed = saveAssessment(withFifth, { ...entry, name: 'Proyecto' })
    expect(renamed.nextAssessment).toBe(6)
    expect(moveAssessment(renamed, entry.id, -1).assessments.map(({ name }) => name))
      .toEqual(['Evaluación 1', 'Evaluación 2', 'Proyecto', 'Evaluación 3'])
  })

  it('mantiene la nota oficial al simular un cero', () => {
    const { assessments } = demoData().courses[0]
    const simulated = withSimulation(assessments, { 'demo-1': 0, 'demo-4': 20 })
    expect(simulated.map(({ grade }) => grade)).toEqual([0, 17, 12, 20])
    expect(assessments.map(({ grade }) => grade)).toEqual([15, 17, 12, null])
  })
})
