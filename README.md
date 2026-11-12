# MiCiclo

Aplicación web para organizar ciclos, cursos y evaluaciones, consultar fechas
académicas y proyectar notas.

## Desarrollo local

Usa Node.js 24 LTS o la versión verificada 26.13.1, con npm. Ejecuta estos comandos desde la raíz del repositorio.

```sh
npm ci
npm run dev
```

Abre la dirección local que imprime Vite. En Windows, si PowerShell bloquea
`npm.ps1`, usa `npm.cmd` en los mismos comandos.

## Comprobaciones

```sh
npm run lint
npm test
npm run build
```

El código de cada módulo está en `src/features` y los componentes compartidos
están en `src/components`. Consulta el [estado del proyecto](docs/ESTADO.md)
y el [plan de ejecución](docs/PLAN_DE_EJECUCION.md) para seguir el avance.

## Datos locales

La primera visita incluye un ciclo y un curso de ejemplo. Los cambios se guardan
en el navegador y se recuperan al recargar en la misma dirección de desarrollo.
Puedes crear, archivar o eliminar ciclos y gestionar sus cursos desde **Ciclos y cursos**.
En **Notas**, las simulaciones duran mientras el editor está abierto. Las actividades
del **Calendario** son independientes de las calificaciones.

## Integración de Supabase

Consulta la [preparación y el estado de H4](docs/H4_SUPABASE.md). El modo local
se usa por defecto. La integración requiere las migraciones de H4 y las
variables publicables de `.env.example` configuradas en `.env.local`.
