import type { ReactNode } from 'react'

type PageProps = {
  title: string
  description: string
  children?: ReactNode
}

export function Page({ title, description, children }: PageProps) {
  return (
    <section aria-labelledby="titulo-pagina" className="mx-auto max-w-5xl">
      <h1 id="titulo-pagina" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
      {children}
    </section>
  )
}
