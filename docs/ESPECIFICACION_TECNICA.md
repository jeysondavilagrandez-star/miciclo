# MiCiclo — Especificación funcional y técnica v1.0

**Producto:** MiCiclo, aplicación web responsive instalable como PWA en una etapa posterior.
**Público:** estudiantes universitarios o de institutos, inicialmente en Perú.
**Propuesta de valor:** calendario académico + calculadora/simulador de notas integrados, con registro único de las evaluaciones.
**Objetivo del MVP:** que un usuario cree un ciclo y cursos, configure evaluaciones con porcentajes, fechas y notas, visualice las evaluaciones en el calendario y proyecte qué requiere para alcanzar una meta, con datos guardados de forma segura.

## 1. Alcance y exclusiones

### MVP obligatorio
1. Interfaz clara y responsive, navegación Inicio, Ciclos/Cursos, Calendario, Notas y Ajustes.
2. Crear, editar y archivar ciclos académicos (nombre, inicio/fin opcionales).
3. Crear, editar y eliminar cursos dentro de un ciclo (nombre, color opcional, nota aprobatoria, escala de 0 a 20, regla de redondeo configurable).
4. Evaluaciones ilimitadas por curso, con nombres iniciales «Evaluación 1», «Evaluación 2», etc.; editable, ordenables, eliminables.
5. Por evaluación: nombre, ponderación porcentual, calificación opcional y fecha/hora opcional; nota vacía significa pendiente, mientras que 0 es una calificación válida.
6. Validar que la suma de pesos sea 100 % para dar por completa la configuración de la fórmula. Permitir guardar borradores incompletos, indicando claramente qué falta; rechazar porcentajes negativos, superiores a 100 individualmente o suma mayor a 100 en configuración confirmada.
7. Cálculo de promedio ponderado, puntos acumulados al promedio final, promedio sobre la parte evaluada, máximo alcanzable y nota promedio necesaria en el peso pendiente para alcanzar una meta.
8. Simulador para ingresar notas hipotéticas sin modificar calificaciones oficiales guardadas; mostrar diferencia entre notas reales y simuladas.
9. Calendario mensual y lista de próximos eventos; muestra automáticamente evaluaciones fechadas y también actividades de estudio y tareas sin peso académico.
10. Actividades propias del calendario (título, curso opcional, inicio/fin opcionales, descripción opcional, estado); no confundir actividades con evaluaciones ni calcularlas como notas.
11. Registro de usuario e inicio de sesión, persistencia, y aislamiento de datos con Supabase Auth + PostgreSQL y políticas RLS. Implementarlo después de validar MVP local.
12. Manejo de estados vacíos, errores, carga, accesibilidad básica, pruebas de cálculos y datos de ejemplo.

### No incluir en MVP (futuro)
- Lectura de sílabos con IA, chat IA, recomendaciones de estudio, sincronización con Google Calendar, notificaciones push, pagos, trabajo en grupo, subevaluaciones complejas, soporte multiescala/multipaís. Diseñar estructura extensible pero no implementarlos aún.

## 2. Reglas exactas de notas
- Escala inicial: 0 a 20; decimales admitidos, cantidad razonable limitada según interfaz.
- `peso` en puntos porcentuales: número decimal entre 0 y 100. Un curso puede tener N evaluaciones.
- `puntos_acumulados = SUM(nota_i * peso_i / 100)` solo sobre evaluaciones con nota registrada. Las pendientes contribuyen 0 puntos acumulados por ahora, **pero no se consideran nota 0**.
- `peso_evaluado = SUM(peso_i)` de evaluaciones con nota real registrada.
- `promedio_de_lo_evaluado = puntos_acumulados / (peso_evaluado / 100)` si peso_evaluado > 0; si no, mostrar «Sin notas».
- `peso_pendiente = 100 - peso_evaluado`, siempre que la distribución total sea 100.
- `promedio_necesario_en_lo_pendiente = (meta - puntos_acumulados) / (peso_pendiente / 100)` si peso_pendiente > 0; con casos: <=0 «meta asegurada por promedio», >20 «no alcanzable» (en escala 0–20); en 0 % pendiente, comparar resultado final.
- `máximo_alcanzable = puntos_acumulados + (peso_pendiente/100)*20`.
- No redondear valores intermedios. La visualización puede mostrar dos decimales; aplicar regla de redondeo de aprobación solo si el usuario la configura explícitamente. Valor inicial: **sin redondeo**.
- Meta configurable; nota mínima aprobatoria inicial **11/20 como valor de ejemplo**, editable por curso; evitar presentarla como regla universal de toda institución.
- Si `SUM(pesos) != 100`, mostrar estado «Distribución incompleta» y **no** emitir una proyección final válida. Permitir editar pesos hasta llegar a 100.
- Si hay criterios externos de nota mínima en examen final, sustitutorios o ponderaciones anidadas, indicar que MVP no los modela; no afirmar aprobación institucional solo por el promedio.
- Requisitos de pruebas: notas vacías vs cero, pesos decimales, suma 100, suma <100, suma >100, objetivo ya asegurado, objetivo imposible, final sin pendientes, redondeo de visualización.

### Ejemplo verificable
Curso con (20 %, 15), (25 %, 17), (25 %, 12), (30 %, pendiente). Puntos acumulados = 3 + 4.25 + 3 = **10.25**. Peso evaluado = 70 %. Promedio evaluado = **14.642857...**. Para meta 11, promedio requerido en 30 % pendiente = **2.50**. Para meta 15, promedio requerido = **15.833333...**.

## 3. Calendario y vínculo con calificaciones
- Las evaluaciones se almacenan **una sola vez**, con fecha opcional.
- El calendario construye su vista a partir de evaluaciones fechadas + actividades independientes; no duplica la evaluación como una tarea en otra tabla.
- Editar la fecha o nombre de una evaluación desde la pantalla de notas modifica también su aparición en el calendario.
- Si una evaluación carece de fecha, no se muestra en el calendario, pero permanece en notas.
- Actividades pueden asociarse con un curso o ser generales. Una tarea completada no equivale a una nota registrada.
- Fechas y zona horaria: tratar fechas de evaluación sin hora como fecha civil (YYYY-MM-DD) para evitar desplazamientos por huso horario; si hay hora, almacenar zona horaria definida.

## 4. Diseño de UX
- Inicio: próximas fechas y resumen de progreso; no confundir notas pendientes con desaprobadas.
- Cursos: tarjetas por ciclo con acceso a evaluaciones y ajustes.
- Notas: editor de evaluaciones, suma de porcentajes, promedio evaluado, puntos acumulados, escenarios simulados.
- Calendario: vista mensual + agenda de día, botones para crear actividad y editar evaluación desde el contexto apropiado.
- Ajustes: preferencias básicas, nota meta predeterminada, opción para salir de la cuenta.
- Priorizar navegación móvil y escritorio, contraste adecuado, teclado y texto claro.

## 5. Stack y arquitectura
- Frontend: React + TypeScript + Vite; TypeScript estricto; componentes funcionales.
- Estilos: Tailwind CSS (configuración compatible con Vite instalado).
- Rutas: React Router compatible con versión instalada.
- Tests: Vitest y React Testing Library si se necesita; pruebas unitarias obligatorias para funciones matemáticas y validaciones.
- Servicios de datos: adaptadores para MVP con datos demo y posteriormente Supabase. No dispersar llamadas SQL entre componentes.
- Base de datos alojada: Supabase PostgreSQL; autenticación con Supabase Auth; todas las tablas de usuario con RLS.
- Publicación futura: Cloudflare Pages con GitHub. **No desplegar ni contratar servicios hasta aprobación**.
- PWA: preparar después de validar experiencia web y política de caché; no cachear información de otro usuario.
- Manejar errores, estados de carga y reintentos razonables. No usar IA para funciones matemáticas.

## 6. Diseño lógico preliminar de datos

**profiles**: `id` (UUID = auth.users.id), `display_name?`, `created_at`, `updated_at`.

**academic_terms**: `id UUID`, `user_id UUID`, `name`, `start_date?`, `end_date?`, `archived_at?`, timestamps.

**courses**: `id UUID`, `user_id UUID`, `term_id UUID`, `name`, `color?`, `passing_grade NUMERIC`, `grade_scale_max NUMERIC DEFAULT 20`, `rounding_mode` (por defecto `none`), timestamps.

**assessments**: `id UUID`, `user_id UUID`, `course_id UUID`, `name`, `position INT`, `weight NUMERIC`, `grade NUMERIC NULL`, `due_date DATE NULL`, `due_time TIME NULL`, timestamps.

**activities**: `id UUID`, `user_id UUID`, `term_id UUID?`, `course_id UUID?`, `title`, `description?`, `starts_at TIMESTAMPTZ?`, `due_date DATE?`, `done BOOLEAN DEFAULT FALSE`, timestamps.

Notas:
- Establecer claves foráneas, cascadas prudentes e índices por `user_id`, `course_id` y fechas.
- Validar integridad de pertenencia cruzada para impedir asociar una evaluación a un curso ajeno o actividad a curso de otra cuenta.
- Usar constraints en BD cuando sea apropiado. La regla de pesos sumando 100 se valida en capa de aplicación para permitir borradores y eventualmente al confirmar.
- No crear estas tablas en remoto sin revisión previa de esquema y autorización.

## 7. Seguridad y privacidad
- Supabase publica solo URL y publishable key en frontend. Nunca incluir claves `service_role` ni secretos en frontend, commits o logs.
- Habilitar RLS en todas las tablas expuestas; restringir SELECT, INSERT, UPDATE, DELETE al propietario; comprobar con al menos dos usuarios y pruebas de acceso cruzado.
- No mezclar datos de estudiantes; protección de sesiones, verificación de correo según política adoptada, recuperación de cuenta y eliminación de datos antes de lanzamiento.
- Preparar aviso de privacidad para tratamiento de datos y mecanismos de exportación/eliminación antes de producción.
- No cargar datos personales reales en el entorno de desarrollo por defecto.

## 8. Requisitos de entrega y aceptación
- `npm run build`, `npm run lint` y `npm test` (o script equivalente) exitosos.
- Crear curso y evaluar notas con múltiples cantidades de evaluaciones.
- Renombrar «Evaluación 1» y agregar «Evaluación 5» sin limitación fija.
- Cambios de fecha/nombre reflejados en calendario sin duplicados.
- Sin promedio final falso cuando los pesos no sumen 100.
- Guardar y recuperar datos con dos cuentas distintas después de integración Supabase, sin accesos cruzados.
- Diseño legible en móvil y escritorio.
- Documentación y `docs/ESTADO.md` actualizados.
