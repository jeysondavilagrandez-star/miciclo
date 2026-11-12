export type Assessment = {
  id: string
  name: string
  weight: number
  grade: number | null
  date: string
  time: string
  timeZone?: string
}

export type Course = {
  id: string
  termId: string
  name: string
  color: string
  target: number
  rounding: 'none' | 'integer'
  nextAssessment: number
  assessments: Assessment[]
}

export type Term = {
  id: string
  name: string
  start: string
  end: string
  archived: boolean
}

export type Activity = {
  id: string
  title: string
  date: string
  start: string
  end: string
  timeZone?: string
  courseId: string
  description: string
  done: boolean
}

export type AcademicData = {
  terms: Term[]
  courses: Course[]
  activities: Activity[]
  defaultTarget: number
}
