# Estado de ejecución MiCiclo

Actualizado el 2026-11-12.

## Confirmado por el usuario / capturas de Codex
- Git local enlazado a GitHub con `main` siguiendo `origin/main`.
- Existe proyecto Supabase `miciclo-dev`; integración app ↔ Supabase aún pendiente.
- React + TypeScript + Vite instalados; build y lint funcionaron.

## Hitos
- [x] H0 Inspección y cimentación
- [x] H1 Cálculos y evaluaciones
- [x] H2 Calendario integrado
- [x] H3 UX y datos de prueba
- [ ] H4 Supabase y seguridad (esquema y pruebas locales preparados)
- [ ] H5 Beta

## Última ejecución
H0 completado. Se verificó que la rama local main sigue a origin/main y que el entorno tiene Node.js 26.13.1, npm 11.20.0, React 19.3.1, TypeScript 7.0.2 y Vite 8.3.8.

- Navegación y pantallas iniciales en español para Inicio, Ciclos y cursos, Calendario, Notas y Ajustes. La navegación se adapta al ancho disponible e indica la ruta activa.
- Estructura de módulos bajo src/features y componentes compartidos en src/components. Se reservaron src/lib, src/types y src/services para las fases siguientes.
- React Router 8.5.1, Tailwind CSS 4.3.5 y Vitest 5.1.0 añadidos a package.json y package-lock.json. Se integró Tailwind en vite.config.ts, se habilitó TypeScript estricto y se añadieron los scripts de pruebas.
- Se actualizaron src/App.tsx, src/main.tsx, src/index.css, index.html y README.md. Las pruebas de rutas están en src/App.test.tsx.
- npm run build y npm run lint pasaron. npm test pasó con 6 pruebas. Chrome sin interfaz renderizó Notas y Calendario con tamaños de ventana de 390 × 844 y 1440 × 900, respectivamente.
- Cambios locales sin commit. Siguiente hito, H1 — cálculos y editor de evaluaciones.

## Bloqueos y acciones del usuario
Para aplicar la migración en miciclo-dev y conectar Auth se requiere autorización explícita. La aplicación local se puede probar sin intervención.

## H1 — Cálculos y evaluaciones
- Implementados el editor por curso, el orden, la validación y la simulación aislada. Los resúmenes usan los cálculos de src/features/grades y el ejemplo inicial de src/services/demo.ts.
- Build, lint y 23 pruebas aprobados. Los ejemplos de metas 11 y 15, el cero, pesos decimales, distribuciones incompletas y límites están cubiertos.
- Siguiente paso, H2. Sin bloqueos.

## H2 — Calendario integrado
- Implementados calendario mensual, agenda, próximos eventos, creación y edición de actividades, estado de completado y acceso directo al editor de Notas.
- La vista se deriva de las evaluaciones de cada curso y de las actividades independientes. Los cambios de fecha y nombre se reflejan sin guardar copias.
- Build, lint y 26 pruebas aprobados, incluidas las pruebas de integración en src/features/calendar/calendar.test.tsx.
- Siguiente paso, H3. Sin bloqueos.

## H3 — Experiencia y datos locales
- Implementados alta, edición, archivo y eliminación confirmada de ciclos, gestión de cursos, resumen de Inicio, ajustes de meta y persistencia local aislada en src/services/localAcademicRepository.ts.
- Build, lint y 30 pruebas aprobados. Las pruebas funcionales recorren ciclos, cursos, notas, simulación, actividades y recarga. Chrome verificó Inicio, Cursos, Notas y Calendario sin desplazamiento horizontal a 360 y 1440 píxeles.
- Siguiente paso, preparar la migración y las pruebas de seguridad de H4 localmente.

## H4 — Preparación local
- Preparados supabase/migrations/20261112145716_academic_schema.sql, supabase/checks/academic_security.sql, .env.example y docs/H4_SUPABASE.md.
- La migración se aplicó con éxito en PostgreSQL 18.6 embebido. Pasaron las pruebas SQL de dos usuarios para RLS, restricciones, vínculos cruzados, cascadas y rol anónimo.
- Estado de reanudación. H1–H3 completos. H4 local preparado. Pendientes autorización para aplicar la migración en miciclo-dev, integración de Auth y Data API, y comprobación con dos sesiones del entorno de desarrollo. No se ejecutaron cambios remotos ni despliegues.
- Verificación final posterior a H4 local. Build, lint y 31 pruebas de la aplicación aprobados. Se añadió cobertura para conservar las evaluaciones de ciclos archivados en el calendario.
- Los cambios quedaron en el árbol de trabajo local, sin commit ni push.
