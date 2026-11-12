import type { AcademicData, Activity, Assessment, Course } from '../../types/academic'

export type CalendarEvent =
  | { kind: 'assessment'; id: string; date: string; time: string; title: string; course: Course; assessment: Assessment }
  | { kind: 'activity'; id: string; date: string; time: string; title: string; course?: Course; activity: Activity }

export function calendarEvents(data: AcademicData): CalendarEvent[] {
  const courses = new Map(data.courses.map((course) => [course.id, course]))
  const assessments = Array.from(courses.values()).flatMap((course) =>
    course.assessments.filter(({ date }) => date).map((assessment) => ({
      kind: 'assessment' as const, id: assessment.id, date: assessment.date, time: assessment.time,
      title: assessment.name, course, assessment,
    })),
  )
  const activities = data.activities.filter(({ courseId }) => !courseId || courses.has(courseId)).map((activity) => ({
    kind: 'activity' as const, id: activity.id, date: activity.date, time: activity.start,
    title: activity.title, course: courses.get(activity.courseId), activity,
  }))

  return [...assessments, ...activities].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'es'))
}

export function assessmentLink(event: Extract<CalendarEvent, { kind: 'assessment' }>) {
  return `/notas?${new URLSearchParams({ curso: event.course.id, evaluacion: event.assessment.id })}`
}
