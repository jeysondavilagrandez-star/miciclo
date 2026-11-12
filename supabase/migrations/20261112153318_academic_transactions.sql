alter table public.profiles
  add column academic_revision bigint not null default 0 check (academic_revision >= 0),
  add column last_academic_mutation uuid;

alter table public.academic_terms add column removed_at timestamptz;
alter table public.courses add column removed_at timestamptz;
alter table public.assessments add column removed_at timestamptz;
alter table public.activities add column removed_at timestamptz;

-- Preserve records even if an authenticated client uses the table API directly.
revoke delete on public.academic_terms, public.courses, public.assessments, public.activities
  from public, anon, authenticated;

create function public.load_academic_workspace(expected_owner uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'revision', coalesce((select academic_revision from public.profiles where id = owner.id), 0),
    'defaultTarget', coalesce((select default_target from public.profiles where id = owner.id), 11),
    'terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'start', coalesce(start_date::text, ''),
        'end', coalesce(end_date::text, ''), 'archived', archived_at is not null
      ) order by created_at, id)
      from public.academic_terms where user_id = owner.id and removed_at is null
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'termId', c.term_id, 'name', c.name, 'color', coalesce(c.color, '#125846'),
        'target', c.passing_grade, 'rounding', c.rounding_mode, 'nextAssessment', c.next_assessment_number,
        'assessments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'name', a.name, 'weight', a.weight, 'grade', a.grade,
            'date', coalesce(a.due_date::text, ''), 'time', coalesce(to_char(a.due_time, 'HH24:MI'), ''),
            'timeZone', a.due_timezone
          ) order by a.position, a.id)
          from public.assessments a where a.user_id = c.user_id and a.course_id = c.id and a.removed_at is null
        ), '[]'::jsonb)
      ) order by c.created_at, c.id)
      from public.courses c where c.user_id = owner.id and c.removed_at is null
    ), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'date', coalesce(due_date::text, ''),
        'start', coalesce(to_char(starts_at at time zone event_timezone, 'HH24:MI'), ''),
        'end', coalesce(to_char(ends_at at time zone event_timezone, 'HH24:MI'), ''),
        'timeZone', event_timezone, 'courseId', coalesce((select c.id::text from public.courses c where c.id = activities.course_id and c.user_id = owner.id and c.removed_at is null), ''),
        'description', coalesce(description, ''), 'done', done
      ) order by created_at, id)
      from public.activities where user_id = owner.id and removed_at is null
    ), '[]'::jsonb)
  )
  from (select auth.uid() as id) owner
  where owner.id = expected_owner;
$$;

create function public.save_academic_changes(
  expected_owner uuid, expected_revision bigint, mutation_id uuid, changes jsonb
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  revision bigint;
  last_mutation uuid;
  changed_courses uuid[];
  removed_courses uuid[];
begin
  if owner_id is null or owner_id is distinct from expected_owner then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if mutation_id is null or expected_revision is null or jsonb_typeof(changes) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid_academic_changes';
  end if;

  insert into public.profiles (id) values (owner_id) on conflict (id) do nothing;
  select p.academic_revision, p.last_academic_mutation into strict revision, last_mutation
  from public.profiles p where p.id = owner_id for update;

  if last_mutation = mutation_id then return revision; end if;
  if revision <> expected_revision then
    raise exception using errcode = '40001', message = 'academic_revision_conflict';
  end if;

  select array_agg(distinct course_id) into changed_courses
  from (
    select a.course_id from public.assessments a
    where a.user_id = owner_id and a.removed_at is null and a.id in (
      select value::uuid from jsonb_array_elements_text(changes->'removeAssessments')
      union
      select item.id from jsonb_to_recordset(changes->'assessments') as item(id uuid)
    )
    union
    select item.course_id from jsonb_to_recordset(changes->'assessments') as item(course_id uuid)
  ) as touched;

  select array_agg(id) into removed_courses
  from public.courses
  where user_id = owner_id and removed_at is null and (
    id in (select value::uuid from jsonb_array_elements_text(changes->'removeCourses'))
    or term_id in (select value::uuid from jsonb_array_elements_text(changes->'removeTerms'))
  );

  -- Hide records from the workspace without erasing rows or their relationships.
  update public.activities set removed_at = statement_timestamp()
  where user_id = owner_id and removed_at is null and id in (
    select value::uuid from jsonb_array_elements_text(changes->'removeActivities')
  );
  update public.assessments set removed_at = statement_timestamp()
  where user_id = owner_id and removed_at is null and (
    course_id = any(removed_courses)
    or id in (select value::uuid from jsonb_array_elements_text(changes->'removeAssessments'))
  );
  update public.courses set removed_at = statement_timestamp()
  where user_id = owner_id and removed_at is null and id = any(removed_courses);
  update public.academic_terms set removed_at = statement_timestamp()
  where user_id = owner_id and removed_at is null and id in (
    select value::uuid from jsonb_array_elements_text(changes->'removeTerms')
  );

  if exists (
    select 1 from jsonb_to_recordset(changes->'terms') as item(id uuid)
    join public.academic_terms t on t.id = item.id where t.user_id = owner_id and t.removed_at is not null
    union all
    select 1 from jsonb_to_recordset(changes->'courses') as item(id uuid)
    join public.courses c on c.id = item.id where c.user_id = owner_id and c.removed_at is not null
    union all
    select 1 from jsonb_to_recordset(changes->'assessments') as item(id uuid)
    join public.assessments a on a.id = item.id where a.user_id = owner_id and a.removed_at is not null
    union all
    select 1 from jsonb_to_recordset(changes->'activities') as item(id uuid)
    join public.activities a on a.id = item.id where a.user_id = owner_id and a.removed_at is not null
  ) then
    raise exception using errcode = '40001', message = 'academic_record_removed';
  end if;

  insert into public.academic_terms (id, user_id, name, start_date, end_date, archived_at)
    select item.id, owner_id, item.name, item.start_date, item.end_date,
      case when item.archived then statement_timestamp() end
    from jsonb_to_recordset(changes->'terms') as item(id uuid, name text, start_date date, end_date date, archived boolean)
    on conflict (id) do update set
      name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date,
      archived_at = case when excluded.archived_at is not null
        then coalesce(academic_terms.archived_at, excluded.archived_at) end
    where academic_terms.user_id = owner_id and academic_terms.removed_at is null;

  if exists (
    select 1 from jsonb_to_recordset(changes->'courses') as item(term_id uuid)
    where not exists (
      select 1 from public.academic_terms t where t.id = item.term_id and t.user_id = owner_id and t.removed_at is null
    )
  ) then
    raise exception using errcode = '23503', message = 'academic_term_unavailable';
  end if;

  insert into public.courses (id, user_id, term_id, name, color, passing_grade, rounding_mode, next_assessment_number)
    select item.id, owner_id, item.term_id, item.name, item.color, item.passing_grade,
      item.rounding_mode, item.next_assessment_number
    from jsonb_to_recordset(changes->'courses') as item(
      id uuid, term_id uuid, name text, color text, passing_grade numeric, rounding_mode text, next_assessment_number integer
    )
    on conflict (id) do update set
      term_id = excluded.term_id, name = excluded.name, color = excluded.color,
      passing_grade = excluded.passing_grade, rounding_mode = excluded.rounding_mode,
      next_assessment_number = excluded.next_assessment_number
    where courses.user_id = owner_id and courses.removed_at is null;

  if exists (
    select item.course_id from jsonb_to_recordset(changes->'assessments') as item(course_id uuid)
    where not exists (
      select 1 from public.courses c where c.id = item.course_id and c.user_id = owner_id and c.removed_at is null
    )
    union all
    select item.course_id from jsonb_to_recordset(changes->'activities') as item(course_id uuid)
    where item.course_id is not null and not exists (
      select 1 from public.courses c where c.id = item.course_id and c.user_id = owner_id and c.removed_at is null
    )
  ) then
    raise exception using errcode = '23503', message = 'academic_course_unavailable';
  end if;

  insert into public.assessments (id, user_id, course_id, name, position, weight, grade, due_date, due_time, due_timezone)
    select item.id, owner_id, item.course_id, item.name, item.position, item.weight, item.grade,
      item.due_date, item.due_time, item.due_timezone
    from jsonb_to_recordset(changes->'assessments') as item(
      id uuid, course_id uuid, name text, position integer, weight numeric, grade numeric,
      due_date date, due_time time, due_timezone text
    )
    on conflict (id) do update set
      course_id = excluded.course_id, name = excluded.name, position = excluded.position,
      weight = excluded.weight, grade = excluded.grade, due_date = excluded.due_date,
      due_time = excluded.due_time, due_timezone = excluded.due_timezone
    where assessments.user_id = owner_id and assessments.removed_at is null;

  if exists (
    select 1 from public.assessments where user_id = owner_id and removed_at is null and course_id = any(changed_courses)
    group by course_id having sum(weight) > 100
  ) then
    raise exception using errcode = '23514', message = 'academic_weight_overflow';
  end if;

  insert into public.activities (id, user_id, course_id, title, description, due_date, starts_at, ends_at, event_timezone, done)
    select item.id, owner_id, item.course_id, item.title, item.description, item.due_date,
      (item.due_date + item.start_time) at time zone item.event_timezone,
      (item.due_date + item.end_time) at time zone item.event_timezone,
      item.event_timezone, item.done
    from jsonb_to_recordset(changes->'activities') as item(
      id uuid, course_id uuid, title text, description text, due_date date,
      start_time time, end_time time, event_timezone text, done boolean
    )
    on conflict (id) do update set
      course_id = case when excluded.course_id is null and exists (
        select 1 from public.courses c where c.id = activities.course_id and c.user_id = owner_id and c.removed_at is not null
      ) then activities.course_id else excluded.course_id end,
      term_id = case when excluded.course_id is null then activities.term_id end,
      title = excluded.title, description = excluded.description, due_date = excluded.due_date,
      starts_at = excluded.starts_at, ends_at = excluded.ends_at, event_timezone = excluded.event_timezone,
      done = excluded.done
    where activities.user_id = owner_id and activities.removed_at is null;

  update public.profiles set
    default_target = coalesce((changes->>'defaultTarget')::numeric, default_target),
    academic_revision = revision + 1,
    last_academic_mutation = mutation_id
  where id = owner_id;

  return revision + 1;
end;
$$;

revoke all on function public.load_academic_workspace(uuid) from public, anon, authenticated;
revoke all on function public.save_academic_changes(uuid, bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.load_academic_workspace(uuid) to authenticated;
grant execute on function public.save_academic_changes(uuid, bigint, uuid, jsonb) to authenticated;
