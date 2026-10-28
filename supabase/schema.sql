-- Run in your project's Supabase SQL editor. Never put a service-role key in the app.
create table if not exists public.habit_spaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.habit_spaces enable row level security;
revoke all on public.habit_spaces from anon;
revoke all on public.habit_spaces from authenticated;
grant select on public.habit_spaces to authenticated;
drop policy if exists "Read only your own space" on public.habit_spaces;
create policy "Read only your own space" on public.habit_spaces
  for select to authenticated using ((select auth.uid()) = owner_id);

-- A single conditional statement performs each write. A stale revision cannot overwrite.
create or replace function public.save_habit_space(expected_owner uuid, expected_revision bigint, next_document jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Sign in before syncing'; end if;
  if auth.uid() is distinct from expected_owner then raise exception 'Account changed during sync'; end if;
  if expected_revision < 0 or jsonb_typeof(next_document) <> 'object'
     or octet_length(next_document::text) > 20000000 then
    raise exception 'Invalid document';
  end if;
  if expected_revision = 0 then
    insert into public.habit_spaces(owner_id, revision, document)
      values (auth.uid(), 1, next_document)
      on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.habit_spaces set revision = revision + 1,
      document = next_document, updated_at = now()
      where owner_id = auth.uid() and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then
    raise exception 'SYNC_CONFLICT: Another device has changed your space';
  end if;
  return next_revision;
end;
$$;
revoke all on function public.save_habit_space(uuid, bigint, jsonb) from public;
grant execute on function public.save_habit_space(uuid, bigint, jsonb) to authenticated;
