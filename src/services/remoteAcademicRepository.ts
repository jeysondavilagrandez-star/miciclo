import type { SupabaseClient } from '@supabase/supabase-js'
import type { AcademicData } from '../types/academic'
import { validData } from './localAcademicRepository'

export type RemoteSnapshot = { data: AcademicData; revision: number }

const courseRow = (course: AcademicData['courses'][number]) => ({
  id: course.id, term_id: course.termId, name: course.name, color: course.color || null,
  passing_grade: course.target, rounding_mode: course.rounding, next_assessment_number: course.nextAssessment,
})

const assessmentRows = (data: AcademicData) => data.courses.flatMap((course) =>
  course.assessments.map((item, position) => ({
    id: item.id, course_id: course.id, name: item.name, position, weight: item.weight, grade: item.grade,
    due_date: item.date || null, due_time: item.time || null, due_timezone: item.time ? item.timeZone : null,
  })),
)

const termRows = (data: AcademicData) => data.terms.map((item) => ({
  id: item.id, name: item.name, start_date: item.start || null, end_date: item.end || null, archived: item.archived,
}))

const activityRows = (data: AcademicData) => data.activities.map((item) => ({
  id: item.id, title: item.title, course_id: item.courseId || null, description: item.description || null,
  due_date: item.date || null, start_time: item.start || null, end_time: item.end || null,
  event_timezone: item.start || item.end ? item.timeZone : null, done: item.done,
}))

function changes<T extends { id: string }>(previous: T[], next: T[]) {
  const oldRows = new Map(previous.map((item) => [item.id, JSON.stringify(item)]))
  const newIds = new Set(next.map(({ id }) => id))
  return {
    upsert: next.filter((item) => oldRows.get(item.id) !== JSON.stringify(item)),
    remove: previous.filter(({ id }) => !newIds.has(id)).map(({ id }) => id),
  }
}

export function academicChanges(previous: AcademicData, next: AcademicData) {
  const terms = changes(termRows(previous), termRows(next))
  const courses = changes(previous.courses.map(courseRow), next.courses.map(courseRow))
  const assessments = changes(assessmentRows(previous), assessmentRows(next))
  const activities = changes(activityRows(previous), activityRows(next))
  return {
    terms: terms.upsert, removeTerms: terms.remove,
    courses: courses.upsert, removeCourses: courses.remove,
    assessments: assessments.upsert, removeAssessments: assessments.remove,
    activities: activities.upsert, removeActivities: activities.remove,
    defaultTarget: previous.defaultTarget === next.defaultTarget ? undefined : next.defaultTarget,
  }
}

export function copyForImport(source: AcademicData): AcademicData {
  const terms = source.terms.map((term) => ({ ...term, id: crypto.randomUUID() }))
  const termIds = new Map(source.terms.map((term, index) => [term.id, terms[index].id]))
  const courses = source.courses.map((course) => ({
    ...course, id: crypto.randomUUID(), termId: termIds.get(course.termId)!,
    assessments: course.assessments.map((assessment) => ({ ...assessment, id: crypto.randomUUID() })),
  }))
  const courseIds = new Map(source.courses.map((course, index) => [course.id, courses[index].id]))
  const activities = source.activities.map((activity) => ({
    ...activity, id: crypto.randomUUID(), courseId: courseIds.get(activity.courseId) ?? '',
  }))
  return { terms, courses, activities, defaultTarget: source.defaultTarget }
}

export async function loadRemoteAcademics(client: SupabaseClient, owner: string): Promise<RemoteSnapshot> {
  const response = await client.rpc('load_academic_workspace', { expected_owner: owner })
  if (response.error) throw response.error
  const normalized: unknown = JSON.parse(JSON.stringify(response.data), (key, value: unknown) =>
    key === 'timeZone' && value === null ? undefined : value)
  if (!validData(normalized) || !('revision' in normalized) ||
    typeof normalized.revision !== 'number' || !Number.isSafeInteger(normalized.revision) || normalized.revision < 0) {
    throw new Error('Respuesta académica inválida')
  }
  return { revision: normalized.revision, data: normalized }
}

export async function saveRemoteAcademics(
  client: SupabaseClient, owner: string, previous: RemoteSnapshot, next: AcademicData, mutationId: string,
) {
  const { data, error } = await client.rpc('save_academic_changes', {
    expected_owner: owner,
    expected_revision: previous.revision,
    mutation_id: mutationId,
    changes: academicChanges(previous.data, next),
  })
  if (error) throw error
  if (typeof data !== 'number' || !Number.isSafeInteger(data) || data !== previous.revision + 1) {
    throw new Error('Revisión académica inválida')
  }
  return { data: next, revision: data }
}

export function isRevisionConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '40001'
}
