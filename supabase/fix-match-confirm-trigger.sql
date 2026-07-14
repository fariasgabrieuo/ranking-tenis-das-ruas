-- Corrige confirmação/recusa de partidas bloqueada pelo trigger de edição.
-- O trigger antigo impedia qualquer mudança de status; confirmar exige pending → confirmed.
-- Execute no Supabase → SQL Editor → Run.

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
