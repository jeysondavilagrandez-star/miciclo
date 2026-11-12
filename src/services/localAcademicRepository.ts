import type { AcademicData } from '../types/academic'
import { validGrade, validWeight, totalWeight } from '../features/grades/calculations'
import { demoData } from './demo'

export const STORAGE_KEY = 'miciclo.academic.v1'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
type Snapshot = { data: AcademicData; raw: string | null; error?: string }

const readError = 'No se pudieron leer los datos guardados. Se abrió la demostración y se conservará la copia original.'
const saveError = 'No se pudieron guardar los cambios en este navegador. Permanecerán disponibles hasta recargar.'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringFields(value: Record<string, unknown>, ...keys: string[]) {
  return keys.every((key) => typeof value[key] === 'string')
}

function civilDate(value: unknown) {
  if (value === '') return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value
}

function clockTime(value: unknown) {
  return typeof value === 'string' && (value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
}

function validData(data: unknown): data is AcademicData {
  if (!record(data) || typeof data.defaultTarget !== 'number' || !validGrade(data.defaultTarget) ||
    !Array.isArray(data.terms) || !Array.isArray(data.courses) || !Array.isArray(data.activities)) return false

  const terms = new Set<string>()
  for (const term of data.terms) {
    if (!record(term) || typeof term.id !== 'string' || terms.has(term.id) || !stringFields(term, 'name') ||
      !civilDate(term.start) || !civilDate(term.end) || typeof term.archived !== 'boolean') return false
    terms.add(term.id)
  }

  const courses = new Set<string>()
  const assessments = new Set<string>()
  for (const course of data.courses) {
    if (!record(course) || typeof course.id !== 'string' || courses.has(course.id) ||
      typeof course.termId !== 'string' || !terms.has(course.termId) || !stringFields(course, 'name', 'color') ||
      typeof course.target !== 'number' || !validGrade(course.target) ||
      (course.rounding !== 'none' && course.rounding !== 'integer') ||
      typeof course.nextAssessment !== 'number' || !Number.isSafeInteger(course.nextAssessment) || course.nextAssessment < 1 ||
      !Array.isArray(course.assessments)) return false
    courses.add(course.id)
    for (const item of course.assessments) {
      if (!record(item) || typeof item.id !== 'string' || assessments.has(item.id) || !stringFields(item, 'name') ||
        !civilDate(item.date) || !clockTime(item.time) || typeof item.weight !== 'number' || !validWeight(item.weight) ||
        (item.grade !== null && (typeof item.grade !== 'number' || !validGrade(item.grade))) ||
        (item.timeZone !== undefined && typeof item.timeZone !== 'string')) return false
      assessments.add(item.id)
    }
    if (totalWeight(course.assessments) > 100) return false
  }

  const activities = new Set<string>()
  for (const activity of data.activities) {
    if (!record(activity) || typeof activity.id !== 'string' || activities.has(activity.id) ||
      !stringFields(activity, 'title', 'description') || !civilDate(activity.date) ||
      !clockTime(activity.start) || !clockTime(activity.end) || typeof activity.done !== 'boolean' ||
      (activity.timeZone !== undefined && typeof activity.timeZone !== 'string') ||
      typeof activity.courseId !== 'string' || (activity.courseId && !courses.has(activity.courseId))) return false
    activities.add(activity.id)
  }
  return true
}

export function loadAcademicData(storage: StorageAccess): Snapshot {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { raw, data: demoData() }
    const parsed: unknown = JSON.parse(raw)
    if (validData(parsed)) return { data: parsed, raw }
  } catch {
    // Storage access can fail when browser policies or damaged data prevent loading.
  }
  return { data: demoData(), raw: null, error: readError }
}

export function saveAcademicData(storage: StorageAccess, snapshot: Snapshot, data: AcademicData): Snapshot {
  try {
    if (storage.getItem(STORAGE_KEY) !== snapshot.raw) {
      return { ...snapshot, data, error: 'Los datos guardados cambiaron o están dañados. Recarga para recuperar la copia guardada. Los cambios de esta sesión siguen en memoria.' }
    }
    const raw = JSON.stringify(data)
    storage.setItem(STORAGE_KEY, raw)
    return { raw, data }
  } catch {
    return { ...snapshot, data, error: saveError }
  }
}

export const browserStorage: StorageAccess = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}
