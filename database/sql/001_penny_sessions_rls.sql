create table if not exists public.penny_sessions (
	session_key text primary key,
	session_uuid uuid not null unique,
	user_id uuid not null default auth.uid(),
	title text not null default 'New chat',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.penny_sessions enable row level security;
alter table public.penny_sessions force row level security;

revoke all on table public.penny_sessions from anon;
revoke all on table public.penny_sessions from authenticated;
grant select, insert, update, delete on table public.penny_sessions to authenticated;

drop policy if exists "penny_sessions_select_own" on public.penny_sessions;
create policy "penny_sessions_select_own"
	on public.penny_sessions
	for select
	to authenticated
	using (user_id = auth.uid());

drop policy if exists "penny_sessions_insert_own" on public.penny_sessions;
create policy "penny_sessions_insert_own"
	on public.penny_sessions
	for insert
	to authenticated
	with check (user_id = auth.uid());

drop policy if exists "penny_sessions_update_own" on public.penny_sessions;
create policy "penny_sessions_update_own"
	on public.penny_sessions
	for update
	to authenticated
	using (user_id = auth.uid())
	with check (user_id = auth.uid());

drop policy if exists "penny_sessions_delete_own" on public.penny_sessions;
create policy "penny_sessions_delete_own"
	on public.penny_sessions
	for delete
	to authenticated
	using (user_id = auth.uid());

create index if not exists penny_sessions_user_updated_idx
	on public.penny_sessions (user_id, updated_at desc);
