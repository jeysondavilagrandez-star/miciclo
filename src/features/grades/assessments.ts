import type { Assessment, Course } from '../../types/academic'
import { totalWeight, validGrade, validWeight } from './calculations'

export function assessmentError(course: Course, assessment: Assessment) {
  if (!assessment.name.trim()) return 'Escribe un nombre para la evaluación.'
  if (!validWeight(assessment.weight)) return 'Ingresa un peso entre 0 y 100, con hasta dos decimales.'
  if (assessment.grade !== null && !validGrade(assessment.grade)) return 'Ingresa una nota entre 0 y 20.'
  if (assessment.time && !assessment.date) return 'Selecciona una fecha para indicar una hora.'
  if (totalWeight([...course.assessments.filter(({ id }) => id !== assessment.id), assessment]) > 100) {
    return 'La suma de pesos no puede superar 100 %. Reduce otro peso primero.'
  }
  return ''
}

export function saveAssessment(course: Course, assessment: Assessment): Course {
  const exists = course.assessments.some(({ id }) => id === assessment.id)
  return {
    ...course,
    nextAssessment: course.nextAssessment + (exists ? 0 : 1),
    assessments: exists
      ? course.assessments.map((entry) => entry.id === assessment.id ? assessment : entry)
      : [...course.assessments, assessment],
  }
}

export function moveAssessment(course: Course, id: string, direction: -1 | 1): Course {
  const index = course.assessments.findIndex((entry) => entry.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= course.assessments.length) return course
  const assessments = [...course.assessments]
  const [assessment] = assessments.splice(index, 1)
  assessments.splice(target, 0, assessment)
  return { ...course, assessments }
}

export function withSimulation(assessments: Assessment[], scenario: Record<string, number>) {
  return assessments.map((entry) => ({ ...entry, grade: scenario[entry.id] ?? entry.grade }))
}
