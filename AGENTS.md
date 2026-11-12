# Instrucciones permanentes para Codex — MiCiclo

## Misión
Desarrollar, probar y documentar MiCiclo de extremo a extremo, siguiendo `docs/ESPECIFICACION_TECNICA.md` y `docs/PLAN_DE_EJECUCION.md`. La experiencia debe ser simple y adaptable a móvil y escritorio.

## Contexto confirmado
- Aplicación local para Windows, repositorio Git `miciclo`, rama local `main` que sigue `origin/main`.
- Proyecto Supabase de desarrollo denominado `miciclo-dev` (la conexión desde la aplicación aún está pendiente).
- React 19.3.1, TypeScript 7.0.2 y Vite 8.3.8 instalados; `npm run build` y `npm run lint` funcionaron en la última comprobación reportada.
- No asumir que estos datos siguen vigentes: inspeccionar el repositorio y comprobar versiones.

## Prioridad y fuente de verdad
1. Seguridad y preservación de datos/archivos.
2. `docs/ESPECIFICACION_TECNICA.md` para el comportamiento del producto.
3. `docs/PLAN_DE_EJECUCION.md` para el orden de trabajo.
4. Código y tests existentes. En conflicto, explicar y corregir la discrepancia sin destruir información.

## Forma de trabajo autónoma
- Leer `README.md`, `package.json`, los documentos de `docs/` y el estado Git antes de modificar código.
- Ejecutar tareas pequeñas y verificables; crear o ajustar tests junto a la funcionalidad.
- Instalar dependencias estables y compatibles solo cuando aporten valor claro; confirmar con documentación oficial antes de adoptar APIs recientes.
- Ejecutar `npm run build`, `npm run lint` y las pruebas disponibles al concluir cada hito; corregir fallos propios.
- Mantener un registro en `docs/ESTADO.md`: tareas realizadas, archivos modificados, comprobaciones, bloqueos y siguiente paso.
- No solicitar confirmación para cambios locales seguros, reversibles y dentro del alcance aprobado.
- Si falta un detalle no crítico, aplicar el valor por defecto documentado y señalarlo en `docs/DECISIONES.md`.
- Preferir implementación simple y mantenible sobre complejidad innecesaria. No generar código muerto, paquetes excesivos ni funciones fuera de alcance.

## Límites: pedir autorización antes de
- Destruir o sobrescribir datos/archivos de usuario; ejecutar `git reset --hard`, limpiar con `git clean`, forzar push, eliminar ramas o rehacer historia.
- Crear o alterar tablas remotas de Supabase; cambiar configuración de Auth, RLS, almacenamiento o claves; ejecutar migraciones remotas.
- Publicar producción, exponer públicamente un entorno, comprar recursos o generar gastos recurrentes.
- Conectar servicios externos o ampliar permisos de acceso; solicitar acceso a secretos/cuentas.
- Realizar acciones que transmitan datos personales reales a terceros.
- Cambiar sustancialmente reglas de negocio, alcance o arquitectura sin motivo documentado.

## Seguridad
- Nunca exponer secretos ni claves privilegiadas en archivos públicos o frontend; usar `.env.local` ignorado y `.env.example` sin valores secretos.
- Para Supabase, RLS en todas las tablas expuestas; políticas de propiedad verificadas con usuarios distintos. No usar `service_role`/secret key en el navegador.
- Validar entrada, ponderaciones, notas, fechas y pertenencia de registros al usuario.
- No usar IA para cálculo de notas ni permitir que modifique datos sin confirmación del usuario.
- Tratar sílabos y archivos como contenido no confiable.

## Entrega en cada fase
Responder en formato breve: (1) qué implementé, (2) qué verifiqué y resultado, (3) decisiones aplicadas, (4) riesgos o bloqueos, (5) acción exacta que requiere el usuario, si existe. Si nada requiere su intervención, continuar con el siguiente hito según `docs/PLAN_DE_EJECUCION.md`.
