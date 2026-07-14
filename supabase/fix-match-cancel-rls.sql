-- Permite cancelar (excluir) partidas: participantes ou admin.
-- Execute no Supabase → SQL Editor → Run.
--
-- Depois de rodar, Gabriel (admin) e os dois jogadores de cada partida
-- podem cancelar partidas pendentes, confirmadas ou recusadas.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Impede que usuários se tornem admin editando o próprio perfil
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from profiles p where p.id = auth.uid())
  );

-- Troca a policy antiga (só quem registrou + pending) pela nova
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

-- Admin do app (ajuste o e-mail se necessário)
update public.profiles
set is_admin = true
where id in (
  select id from auth.users where lower(email) = 'fariasgabriel.dg@gmail.com'
);
