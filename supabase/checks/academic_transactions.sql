begin;
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
set local role authenticated;

do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  b uuid := '00000000-0000-4000-8000-000000000002';
  first_mutation uuid := gen_random_uuid();
  next_mutation uuid := gen_random_uuid();
  term uuid := gen_random_uuid();
  course uuid := gen_random_uuid();
  assessment uuid := gen_random_uuid();
  activity uuid := gen_random_uuid();
  data jsonb;
  extra_activity uuid := gen_random_uuid();
  extra_assessment uuid := gen_random_uuid();
  initial jsonb;
begin
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  initial := jsonb_build_object(
    'terms', jsonb_build_array(jsonb_build_object('id', term, 'name', 'Ciclo')),
    'courses', jsonb_build_array(jsonb_build_object(
      'id', course, 'term_id', term, 'name', 'Curso', 'passing_grade', 11, 'rounding_mode', 'none', 'next_assessment_number', 2)),
    'assessments', jsonb_build_array(jsonb_build_object(
      'id', assessment, 'course_id', course, 'name', 'Evaluación 1', 'position', 0, 'weight', 30.25,
      'grade', 0, 'due_date', '2026-11-20', 'due_time', '14:00', 'due_timezone', 'America/Lima')),
    'activities', jsonb_build_array(jsonb_build_object(
      'id', activity, 'course_id', course, 'title', 'Repaso', 'due_date', '2026-11-20',
      'start_time', '13:00', 'event_timezone', 'America/Lima', 'done', false))
  );
  if public.save_academic_changes(a, 0, first_mutation, initial) <> 1 then raise exception 'No se guardó la primera revisión'; end if;
  if public.save_academic_changes(a, 0, first_mutation, initial) <> 1 then raise exception 'El reintento no fue idempotente'; end if;
  data := public.load_academic_workspace(a);
  if data #>> '{courses,0,assessments,0,grade}' <> '0' or data #>> '{courses,0,assessments,0,time}' <> '14:00'
    or data #>> '{activities,0,start}' <> '13:00' then raise exception 'La instantánea alteró la nota o la hora'; end if;

  begin
    perform public.save_academic_changes(a, 0, gen_random_uuid(), '{}');
    raise exception 'Se admitió una revisión obsoleta';
  exception when serialization_failure then null;
  end;
  begin
    perform public.save_academic_changes(a, 1, gen_random_uuid(), jsonb_build_object(
      'defaultTarget', 17,
      'assessments', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'course_id', course,
        'name', 'Exceso', 'position', 1, 'weight', 70))));
    raise exception 'Se admitió una suma de pesos superior a 100';
  exception when check_violation then null;
  end;
  if public.load_academic_workspace(a) <> data then raise exception 'La transacción fallida cambió los datos'; end if;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  if public.load_academic_workspace(a) is not null then raise exception 'Se cargó una sesión ajena'; end if;
  begin
    perform public.save_academic_changes(a, 1, gen_random_uuid(), '{}');
    raise exception 'Se escribió con un identificador de sesión ajeno';
  exception when insufficient_privilege then null;
  end;
  if jsonb_array_length(public.load_academic_workspace(b)->'courses') <> 0 then raise exception 'Lectura de otra cuenta'; end if;
  begin
    perform public.save_academic_changes(b, 0, gen_random_uuid(), initial);
    raise exception 'Se admitió una escritura sobre otra cuenta';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
  perform public.save_academic_changes(b, 0, gen_random_uuid(), jsonb_build_object('removeTerms', jsonb_build_array(term)));
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  if public.load_academic_workspace(a) <> data then raise exception 'La otra cuenta modificó los datos'; end if;

  begin
    delete from public.courses where id = course;
    raise exception 'El rol autenticado pudo borrar físicamente un curso';
  exception when insufficient_privilege then null;
  end;

  insert into public.activities (id, title) values (extra_activity, 'Actividad independiente');
  insert into public.assessments (id, course_id, name, position, weight, grade)
    values (extra_assessment, course, 'Nota preservada', 1, 10, 12);
  perform public.save_academic_changes(a, 1, next_mutation, jsonb_build_object(
    'removeActivities', jsonb_build_array(extra_activity),
    'removeAssessments', jsonb_build_array(extra_assessment)));
  if not exists (select 1 from public.activities where id = extra_activity and removed_at is not null)
    or not exists (select 1 from public.assessments where id = extra_assessment and grade = 12 and removed_at is not null) then
    raise exception 'Una baja directa perdió información';
  end if;

  perform public.save_academic_changes(a, 2, gen_random_uuid(), jsonb_build_object(
    'removeTerms', jsonb_build_array(term), 'defaultTarget', 13));
  data := public.load_academic_workspace(a);
  if jsonb_array_length(data->'terms') <> 0 or jsonb_array_length(data->'courses') <> 0 or data #>> '{activities,0,courseId}' <> ''
    or data->>'defaultTarget' <> '13' then raise exception 'La baja del ciclo no se reflejó en la vista'; end if;
  if not exists (select 1 from public.academic_terms where id = term and name = 'Ciclo' and removed_at is not null)
    or not exists (select 1 from public.courses where id = course and term_id = term and removed_at is not null)
    or not exists (select 1 from public.assessments where id = assessment and course_id = course and grade = 0 and removed_at is not null)
    or not exists (select 1 from public.activities where id = activity and course_id = course and removed_at is null) then
    raise exception 'La baja del ciclo perdió registros o relaciones';
  end if;
  begin
    perform public.save_academic_changes(a, 3, gen_random_uuid(), jsonb_build_object(
      'assessments', jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'course_id', course, 'name', 'Oculta', 'position', 1, 'weight', 0))));
    raise exception 'Se permitió agregar una evaluación a un curso dado de baja';
  exception when foreign_key_violation then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.load_academic_workspace(null);
    raise exception 'Acceso anónimo a la lectura';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_academic_changes(null, 0, gen_random_uuid(), '{}');
    raise exception 'Acceso anónimo a la escritura';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
