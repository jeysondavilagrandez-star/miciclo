import type { AcademicData } from '../types/academic'
import { DEFAULT_TARGET } from '../features/grades/calculations'

export function demoData(): AcademicData {
  return {
    defaultTarget: DEFAULT_TARGET,
    terms: [{ id: 'demo-term', name: 'Ciclo de ejemplo', start: '', end: '', archived: false }],
    courses: [{
      id: 'demo-course', termId: 'demo-term', name: 'Curso de ejemplo', color: '#125846',
      target: DEFAULT_TARGET, rounding: 'none', nextAssessment: 5,
      assessments: [
        { id: 'demo-1', name: 'Evaluación 1', weight: 20, grade: 15, date: '', time: '' },
        { id: 'demo-2', name: 'Evaluación 2', weight: 25, grade: 17, date: '', time: '' },
        { id: 'demo-3', name: 'Evaluación 3', weight: 25, grade: 12, date: '', time: '' },
        { id: 'demo-4', name: 'Evaluación 4', weight: 30, grade: null, date: '', time: '' },
      ],
    }],
    activities: [],
  }
}
