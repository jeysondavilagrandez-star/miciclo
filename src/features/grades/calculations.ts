import type { Assessment } from '../../types/academic'

type GradeEntry = Pick<Assessment, 'weight' | 'grade'>

export const MAX_GRADE = 20
export const DEFAULT_TARGET = 11

export function validGrade(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_GRADE
}

function hundredths(value: number) {
  return Math.round(value * 100)
}

export function validWeight(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100 && hundredths(value) / 100 === value
}

export function totalWeight(entries: GradeEntry[]) {
  return entries.reduce((sum, entry) => sum + hundredths(entry.weight), 0) / 100
}

export function calculateGrades(entries: GradeEntry[], target: number) {
  if (!validGrade(target) || entries.some(({ weight, grade }) =>
    !validWeight(weight) || (grade !== null && !validGrade(grade)))) {
    throw new RangeError('Ponderación, calificación o meta fuera de rango.')
  }

  const weight = totalWeight(entries)
  const graded = entries.filter(({ grade }) => grade !== null)
  const evaluated = totalWeight(graded)
  const points = graded.reduce((sum, entry) => sum + (entry.grade ?? 0) * hundredths(entry.weight), 0) / 10_000
  const average = evaluated > 0 ? points / (evaluated / 100) : null
  const summary = { weight, evaluated, points, average }

  if (weight !== 100) return { ...summary, projection: null }

  const remaining = 100 - evaluated
  const maximum = points + remaining * MAX_GRADE / 100
  const required = remaining > 0 ? (target - points) / (remaining / 100) : null
  const tolerance = Number.EPSILON * MAX_GRADE * 4
  const status: 'reached' | 'missed' | 'secured' | 'impossible' | 'possible' = remaining === 0
    ? (points + tolerance >= target ? 'reached' : 'missed')
    : points + tolerance >= target ? 'secured'
      : maximum + tolerance < target ? 'impossible' : 'possible'

  return { ...summary, projection: { remaining, maximum, required, status } }
}

export function formatGrade(value: number) {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value)
}
