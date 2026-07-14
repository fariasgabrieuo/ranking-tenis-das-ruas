-- Schema v2 — Tênis das Ruas (auth, perfis, partidas com confirmação)
-- Execute no Supabase → SQL Editor
--
-- Se você já rodou schema.sql (v1), apague as tabelas antigas antes:
--   drop table if exists matches cascade;
--   drop table if exists players cascade;

-- Tipos
create type match_type as enum ('ranked', 'friendly');
create type match_status as enum ('pending', 'confirmed', 'rejected');

-- Perfis (1:1 com auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text not null,
  avatar_url text,
  bairro text,
  cidade text,
  about text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_unique unique (nickname)
);

create index if not exists profiles_nickname_idx on profiles (nickname);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Partidas (1 set = 1 partida)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references profiles(id) on delete restrict,
  player2_id uuid not null references profiles(id) on delete restrict,
  registered_by_id uuid not null references profiles(id) on delete restrict,
  match_type match_type not null default 'ranked',
  status match_status not null default 'pending',
  winner_id uuid references profiles(id),
  score_display text not null,
  player1_games int not null check (player1_games >= 0 and player1_games <= 7),
  player2_games int not null check (player2_games >= 0 and player2_games <= 7),
  had_tiebreak boolean not null default false,
  played_at date not null default current_date,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint different_players check (player1_id <> player2_id),
  constraint pending_no_winner check (
    status = 'pending'
    or (winner_id is not null and winner_id in (player1_id, player2_id))
  ),
  constraint rejected_no_winner check (
    status <> 'rejected' or winner_id is null
  )
);

create index if not exists matches_played_at_idx on matches (played_at desc);
create index if not exists matches_status_idx on matches (status);
create index if not exists matches_player1_idx on matches (player1_id);
create index if not exists matches_player2_idx on matches (player2_id);

-- Snapshots para setas de posição (fase futura)
create table if not exists ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  snapshot jsonb not null
);

-- Conquistas desbloqueadas
create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  constraint user_achievements_unique unique (user_id, achievement_id)
);

-- Feed / timeline
create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists timeline_events_created_at_idx on timeline_events (created_at desc);

-- Row Level Security
alter table profiles enable row level security;
alter table matches enable row level security;
alter table ranking_snapshots enable row level security;
alter table user_achievements enable row level security;
alter table timeline_events enable row level security;

-- Perfis: leitura pública, edição só do próprio
drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from profiles p where p.id = auth.uid())
  );

-- Partidas
drop policy if exists "Matches are viewable by everyone" on matches;
create policy "Matches are viewable by everyone"
  on matches for select using (true);

drop policy if exists "Authenticated users can register matches" on matches;
create policy "Authenticated users can register matches"
  on matches for insert with check (
    auth.uid() is not null
    and auth.uid() = registered_by_id
    and auth.uid() in (player1_id, player2_id)
  );

drop policy if exists "Opponent can confirm or reject" on matches;
create policy "Opponent can confirm or reject"
  on matches for update
  using (
    auth.uid() is not null
    and status = 'pending'
    and auth.uid() in (player1_id, player2_id)
    and auth.uid() <> registered_by_id
  )
  with check (
    auth.uid() is not null
    and status in ('confirmed', 'rejected')
    and auth.uid() in (player1_id, player2_id)
    and auth.uid() <> registered_by_id
  );

drop policy if exists "Registrar can delete pending match" on matches;
drop policy if exists "Participants or admin can delete matches" on matches;
create policy "Participants or admin can delete matches"
  on matches for delete using (
    auth.uid() in (player1_id, player2_id)
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin is true
    )
  );

-- Snapshots / conquistas / timeline (leitura pública por enquanto)
drop policy if exists "Snapshots viewable by everyone" on ranking_snapshots;
create policy "Snapshots viewable by everyone"
  on ranking_snapshots for select using (true);

drop policy if exists "Achievements viewable by everyone" on user_achievements;
create policy "Achievements viewable by everyone"
  on user_achievements for select using (true);

drop policy if exists "Timeline viewable by everyone" on timeline_events;
create policy "Timeline viewable by everyone"
  on timeline_events for select using (true);

drop policy if exists "Authenticated can insert timeline" on timeline_events;
create policy "Authenticated can insert timeline"
  on timeline_events for insert with check (auth.uid() is not null);

-- Storage: avatares
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
