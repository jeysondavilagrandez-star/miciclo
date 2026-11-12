-- Ejecutar sobre una base local desechable con la migración aplicada.
-- Las cuentas son sintéticas y toda la prueba se revierte.
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

set local role authenticated;

do $$
declare
  account integer;
  account_id uuid;
  term_id uuid;
  course_id uuid;
begin
  for account in 1..2 loop
    account_id := ('00000000-0000-4000-8000-00000000000' || account)::uuid;
    perform set_config('request.jwt.claim.sub', account_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', account_id)::text, true);
    insert into public.profiles (display_name) values ('Cuenta ' || account);
    insert into public.academic_terms (name) values ('Ciclo ' || account) returning id into term_id;
    insert into public.courses (name, term_id) values ('Curso ' || account, term_id) returning id into course_id;
    insert into public.assessments (name, course_id, position, weight, grade)
      values ('Evaluación ' || account, course_id, 0, 30.25, 0);
    insert into public.activities (title, course_id) values ('Actividad ' || account, course_id);
  end loop;
end;
$$;

do $$
declare
  account integer;
  account_id uuid;
  other_id uuid;
  item record;
  owned_rows integer;
  foreign_rows integer;
  affected integer;
begin
  for account in 1..2 loop
    account_id := ('00000000-0000-4000-8000-00000000000' || account)::uuid;
    other_id := ('00000000-0000-4000-8000-00000000000' || (3 - account))::uuid;
    perform set_config('request.jwt.claim.sub', account_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', account_id)::text, true);

    for item in select * from (values
      ('profiles', 'id', 'display_name'),
      ('academic_terms', 'user_id', 'name'),
      ('courses', 'user_id', 'name'),
      ('assessments', 'user_id', 'name'),
      ('activities', 'user_id', 'title')
    ) as tables(table_name, owner_column, text_column) loop
      execute format('select count(*) filter (where %1$I = $1), count(*) filter (where %1$I <> $1) from public.%2$I',
        item.owner_column, item.table_name) into owned_rows, foreign_rows using account_id;
      if owned_rows <> 1 or foreign_rows <> 0 then raise exception 'SELECT sin aislamiento en %', item.table_name; end if;

      execute format('update public.%I set %I = %I where %I = $1', item.table_name, item.text_column, item.text_column, item.owner_column)
        using other_id;
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'UPDATE cruzado en %', item.table_name; end if;

      execute format('delete from public.%I where %I = $1', item.table_name, item.owner_column) using other_id;
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'DELETE cruzado en %', item.table_name; end if;

      execute format('update public.%I set %I = %I || $2 where %I = $1',
        item.table_name, item.text_column, item.text_column, item.owner_column) using account_id, ' editado';
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Falló UPDATE propio en %', item.table_name; end if;

      begin
        execute format('update public.%I set %I = $1 where %I = $2', item.table_name, item.owner_column, item.owner_column)
          using other_id, account_id;
        raise exception 'Se permitió transferir la propiedad en %', item.table_name;
      exception when insufficient_privilege then null;
      end;
    end loop;
  end loop;
end;
$$;

reset role;

select set_config('miciclo_test.other_term',
  (select id::text from public.academic_terms where user_id = '00000000-0000-4000-8000-000000000002'), true);
select set_config('miciclo_test.other_course',
  (select id::text from public.courses where user_id = '00000000-0000-4000-8000-000000000002'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001"}', true);

do $$
declare
  other_term uuid := current_setting('miciclo_test.other_term')::uuid;
  other_course uuid := current_setting('miciclo_test.other_course')::uuid;
  own_course uuid := (select id from public.courses);
begin
  begin
    insert into public.academic_terms (user_id, name) values ('00000000-0000-4000-8000-000000000002', 'Ajeno');
    raise exception 'INSERT con propietario ajeno permitido';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.courses (term_id, name) values (other_term, 'Ajeno');
    raise exception 'Curso asociado a ciclo ajeno';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.assessments (course_id, name, weight, position) values (other_course, 'Ajena', 10, 0);
    raise exception 'Evaluación asociada a curso ajeno';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.activities (course_id, title) values (other_course, 'Ajena');
    raise exception 'Actividad asociada a curso ajeno';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.activities (term_id, title) values (other_term, 'Ajena');
    raise exception 'Actividad asociada a ciclo ajeno';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.assessments (course_id, name, weight, position, grade) values (own_course, 'Inválida', 100, 1, 21);
    raise exception 'Nota fuera de escala permitida';
  exception when check_violation then null;
  end;
  begin
    insert into public.assessments (course_id, name, weight, position) values (own_course, 'Inválida', 0.001, 1);
    raise exception 'Ponderación con más de dos decimales permitida';
  exception when check_violation then null;
  end;

  delete from public.academic_terms;
  if exists (select from public.courses) or exists (select from public.assessments) then
    raise exception 'No se eliminaron los registros dependientes';
  end if;
  if (select count(*) from public.activities where course_id is null) <> 1 then
    raise exception 'La actividad debe conservarse como general';
  end if;
end;
$$;

set local role anon;
do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'academic_terms', 'courses', 'assessments', 'activities'] loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'Tabla accesible desde el rol anónimo: %', table_name;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

reset role;
rollback;
