-- Permite editar partidas confirmadas: participantes ou admin.
-- Execute no Supabase → SQL Editor → Run.
-- Requer fix-match-cancel-rls.sql (coluna is_admin) já aplicado.

create or replace function public.protect_match_identity_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.player1_id is distinct from old.player1_id
      or new.player2_id is distinct from old.player2_id
      or new.registered_by_id is distinct from old.registered_by_id then
      raise exception 'Não é permitido alterar jogadores da partida';
    end if;

    if old.status is distinct from new.status then
      if not (old.status = 'pending' and new.status in ('confirmed', 'rejected')) then
        raise exception 'Não é permitido alterar status da partida';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_protect_identity on public.matches;
create trigger matches_protect_identity
  before update on public.matches
  for each row execute function public.protect_match_identity_fields();

drop policy if exists "Participants or admin can edit confirmed matches" on matches;

create policy "Participants or admin can edit confirmed matches"
  on matches for update
  using (
    status = 'confirmed'
    and (
      auth.uid() in (player1_id, player2_id)
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.is_admin is true
      )
    )
  )
  with check (
    status = 'confirmed'
    and winner_id in (player1_id, player2_id)
    and (
      auth.uid() in (player1_id, player2_id)
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.is_admin is true
      )
    )
  );
