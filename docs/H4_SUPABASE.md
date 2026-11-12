# H4 — Esquema y seguridad de Supabase

La [migración versionada](../supabase/migrations/20261112145716_academic_schema.sql)
define perfiles, ciclos, cursos, evaluaciones y actividades. PostgreSQL exige
pertenencia común en las relaciones mediante claves foráneas compuestas. Las
cinco tablas tienen RLS y permisos de lectura y escritura explícitos para
`authenticated`. El rol `anon` carece de acceso a estas tablas.

- Un perfil se vincula a `auth.users.id`. La integración podrá crearlo al
  guardar la primera preferencia.
- Un curso pertenece a un ciclo. Una evaluación pertenece a un curso y conserva
  su nombre, posición y fecha. La suma de pesos se valida en el editor. La
  integración remota deberá validar también la distribución al guardar el conjunto
  de evaluaciones de un curso, dentro de una transacción.
- Una actividad puede ser general o vincularse a un ciclo o a un curso. Si se
  vincula a un curso, su ciclo se obtiene a través del curso. Borrar un curso o
  ciclo conserva las actividades asociadas y elimina las evaluaciones dependientes.
- Las fechas civiles usan `date`. Las evaluaciones con hora guardan hora local
  y zona. Las actividades con hora guardan el instante y la zona de presentación.
- `.env.example` reserva la URL y la clave publicable. La configuración de cada
  entorno se coloca en `.env.local` al conectar la aplicación.

## Verificación local

[academic_security.sql](../supabase/checks/academic_security.sql) crea dos
cuentas sintéticas y comprueba lectura y escritura propias, aislamiento cruzado,
rechazo de asociaciones ajenas, restricciones de notas y pesos, conservación de
actividades al eliminar un ciclo y permisos del rol anónimo. La prueba revierte
sus cambios al terminar.

La migración y las pruebas pasaron en PostgreSQL 18.6 embebido con PGlite.
El entorno de prueba reprodujo los roles y la función `auth.uid()`. La emisión
de tokens, el acceso por la Data API y el flujo de sesión quedan para la
integración de H4.

Para repetir las pruebas con una instancia local desechable de Supabase que ya
tenga aplicada la migración, configura `MICICLO_LOCAL_DATABASE_URL` con la
conexión del entorno local y ejecuta desde PowerShell:

```powershell
psql $env:MICICLO_LOCAL_DATABASE_URL -X -v ON_ERROR_STOP=1 -f supabase/checks/academic_security.sql
```

## Punto de intervención

La ejecución en `miciclo-dev` requiere autorización explícita. Después se
deben verificar el destino, el estado inicial del esquema, la exposición en la
Data API y las credenciales publicables del entorno. La conexión de Auth, las
operaciones CRUD y el aislamiento con dos sesiones reales completan H4.

Referencias de implementación.
[Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) ·
[Permisos de la Data API](https://supabase.com/docs/guides/api/securing-your-api) ·
[Claves foráneas de PostgreSQL](https://www.postgresql.org/docs/15/ddl-constraints.html)
