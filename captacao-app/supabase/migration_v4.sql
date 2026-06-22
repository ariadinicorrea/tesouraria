-- =====================================================================
--  MIGRAÇÃO v4 — situação do resgate (solicitado / efetuado)
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================
alter table resgates add column if not exists status text not null default 'efetuado';
alter table resgates add column if not exists efetuado_em timestamptz;
