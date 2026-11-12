create schema miciclo_private;
revoke all on schema miciclo_private from public, anon, authenticated;

create function miciclo_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke all on function miciclo_private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text check (display_name is null or btrim(display_name) <> ''),
  default_target numeric not null default 11 check (default_target between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  start_date date,
  end_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (end_date >= start_date)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term_id uuid not null,
  name text not null check (btrim(name) <> ''),
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  passing_grade numeric not null default 11 check (passing_grade between 0 and 20),
  grade_scale_max numeric not null default 20 check (grade_scale_max = 20),
  rounding_mode text not null default 'none' check (rounding_mode in ('none', 'integer')),
  next_assessment_number integer not null default 1 check (next_assessment_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, term_id) references public.academic_terms (user_id, id) on delete cascade
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null,
  name text not null check (btrim(name) <> ''),
  position integer not null check (position >= 0),
  weight numeric not null check (weight between 0 and 100 and weight = trunc(weight, 2)),
  grade numeric check (grade between 0 and 20),
  due_date date,
  due_time time check (due_time < time '24:00'),
  due_timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, course_id) references public.courses (user_id, id) on delete cascade,
  check (
    (due_time is null and due_timezone is null) or
    (due_time is not null and due_date is not null and nullif(btrim(due_timezone), '') is not null)
  )
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term_id uuid,
  course_id uuid,
  title text not null check (btrim(title) <> ''),
  description text,
  due_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  event_timezone text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, term_id) references public.academic_terms (user_id, id) on delete set null (term_id),
  foreign key (user_id, course_id) references public.courses (user_id, id) on delete set null (course_id),
  check (course_id is null or term_id is null),
  check (ends_at >= starts_at),
  check (
    (starts_at is null and ends_at is null and event_timezone is null) or
    ((starts_at is not null or ends_at is not null) and due_date is not null
      and nullif(btrim(event_timezone), '') is not null)
  )
);

create index courses_owner_term_idx on public.courses (user_id, term_id);
create index assessments_owner_course_order_idx on public.assessments (user_id, course_id, position);
create index assessments_owner_date_idx on public.assessments (user_id, due_date) where due_date is not null;
create index activities_owner_course_idx on public.activities (user_id, course_id);
create index activities_owner_term_idx on public.activities (user_id, term_id);
create index activities_owner_date_idx on public.activities (user_id, due_date);

alter table public.profiles enable row level security;
alter table public.academic_terms enable row level security;
alter table public.courses enable row level security;
alter table public.assessments enable row level security;
alter table public.activities enable row level security;

revoke all on table public.profiles, public.academic_terms, public.courses, public.assessments, public.activities
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.profiles, public.academic_terms, public.courses, public.assessments, public.activities
  to authenticated;

create policy profiles_owner on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy academic_terms_owner on public.academic_terms for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy courses_owner on public.courses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy assessments_owner on public.assessments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy activities_owner on public.activities for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function miciclo_private.set_updated_at();
create trigger academic_terms_updated_at before update on public.academic_terms
  for each row execute function miciclo_private.set_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute function miciclo_private.set_updated_at();
create trigger assessments_updated_at before update on public.assessments
  for each row execute function miciclo_private.set_updated_at();
create trigger activities_updated_at before update on public.activities
  for each row execute function miciclo_private.set_updated_at();
