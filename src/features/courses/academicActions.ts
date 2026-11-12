import type { AcademicData, Course, Term } from '../../types/academic'
import { validGrade } from '../grades/calculations'

export function termError(term: Term) {
  if (!term.name.trim()) return 'Escribe un nombre para el ciclo.'
  if (term.start && term.end && term.start > term.end) return 'La fecha final debe ser igual o posterior a la inicial.'
  return ''
}

export function courseError(course: Course) {
  if (!course.name.trim()) return 'Escribe un nombre para el curso.'
  if (!validGrade(course.target)) return 'La meta debe estar entre 0 y 20.'
  return ''
}

export function upsertById<T extends { id: string }>(items: T[], item: T) {
  return items.some(({ id }) => id === item.id)
    ? items.map((previous) => previous.id === item.id ? item : previous)
    : [...items, item]
}

export function removeCourse(data: AcademicData, id: string): AcademicData {
  return {
    ...data,
    courses: data.courses.filter((course) => course.id !== id),
    activities: data.activities.map((activity) => activity.courseId === id ? { ...activity, courseId: '' } : activity),
  }
}

export function removeTerm(data: AcademicData, id: string): AcademicData {
  const courseIds = new Set(data.courses.filter(({ termId }) => termId === id).map((course) => course.id))
  return {
    ...data,
    terms: data.terms.filter((term) => term.id !== id),
    courses: data.courses.filter((course) => !courseIds.has(course.id)),
    activities: data.activities.map((activity) => courseIds.has(activity.courseId) ? { ...activity, courseId: '' } : activity),
  }
}
