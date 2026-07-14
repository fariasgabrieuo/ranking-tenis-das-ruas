-- Corrige confirmação/recusa de partidas (RLS bloqueava o UPDATE).
-- Execute no Supabase → SQL Editor → Run.
--
-- Problema: a policy antiga exigia status = 'pending' também na linha NOVA,
-- então confirmar (status → confirmed) falhava com:
-- "new row violates row-level security policy for table matches"

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
