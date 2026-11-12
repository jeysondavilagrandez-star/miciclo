import { calculateGrades, formatGrade } from './calculations'

type Summary = ReturnType<typeof calculateGrades>

const messages = {
  reached: 'Meta alcanzada',
  missed: 'Meta no alcanzada',
  secured: 'Meta asegurada por promedio',
  impossible: 'Meta no alcanzable',
  possible: 'Meta alcanzable',
}

export function GradeSummary({ title, summary, rounding, target }: { title: string; summary: Summary; rounding: string; target: number }) {
  const { average, evaluated, points, projection, weight } = summary
  const roundedFinal = rounding === 'integer' && projection?.remaining === 0
    ? Math.round(projection.maximum) : null
  return (
    <section className="panel">
      <h2>{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div><dt>Peso distribuido</dt><dd>{formatGrade(weight)} %</dd></div>
        <div><dt>Peso evaluado</dt><dd>{formatGrade(evaluated)} %</dd></div>
        <div><dt>Puntos acumulados</dt><dd>{formatGrade(points)}</dd></div>
        <div><dt>Promedio evaluado</dt><dd>{average === null ? 'Sin notas' : formatGrade(average)}</dd></div>
        {projection && <>
          <div><dt>{projection.remaining === 0 ? 'Promedio final' : 'Máximo alcanzable'}</dt><dd>{formatGrade(projection.maximum)}</dd></div>
          <div><dt>Peso pendiente</dt><dd>{formatGrade(projection.remaining)} %</dd></div>
          {projection.required !== null && projection.status === 'possible' &&
            <div><dt>Nota necesaria</dt><dd>{formatGrade(Math.max(0, Math.min(20, projection.required)))}</dd></div>}
        </>}
      </dl>
      {roundedFinal !== null && <p className="mt-3">
        Para aprobación con redondeo: {roundedFinal}/20 · {roundedFinal >= target ? 'Meta alcanzada' : 'Meta no alcanzada'}
      </p>}
      <p className="mt-3 font-medium" role="status">
        {projection ? (roundedFinal === null ? messages[projection.status] : null) : 'Distribución incompleta. La suma debe ser 100 %.'}
      </p>
    </section>
  )
}
