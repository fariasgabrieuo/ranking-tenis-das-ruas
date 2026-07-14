-- Supabase schema for ranking-tenis-das-ruas
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

-- Players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint players_name_unique unique (name)
);

-- Matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references players(id) on delete restrict,
  player2_id uuid not null references players(id) on delete restrict,
  winner_id uuid references players(id) on delete set null,
  is_draw boolean not null default false,
  score text,
  played_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint different_players check (player1_id <> player2_id),
  constraint winner_valid check (
    (is_draw and winner_id is null)
    or (not is_draw and winner_id in (player1_id, player2_id))
  )
);

create index if not exists matches_played_at_idx on matches (played_at desc);
create index if not exists matches_player1_idx on matches (player1_id);
create index if not exists matches_player2_idx on matches (player2_id);

-- Row Level Security (simples — leitura/escrita pública com anon key)
-- Para grupo fechado, adicione autenticação depois (veja TUTORIAL.md)
alter table players enable row level security;
alter table matches enable row level security;

create policy "Leitura pública de jogadores"
  on players for select using (true);

create policy "Inserir jogadores"
  on players for insert with check (true);

create policy "Atualizar jogadores"
  on players for update using (true);

create policy "Remover jogadores"
  on players for delete using (true);

create policy "Leitura pública de partidas"
  on matches for select using (true);

create policy "Inserir partidas"
  on matches for insert with check (true);

create policy "Atualizar partidas"
  on matches for update using (true);

create policy "Remover partidas"
  on matches for delete using (true);
