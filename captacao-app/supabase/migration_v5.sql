-- =====================================================================
--  MIGRAÇÃO v5 — configurações (logo), IOF nos resgates
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================
create table if not exists configuracoes (
  id text primary key default 'singleton',
  logo_data_url text,
  updated_at timestamptz not null default now()
);
insert into configuracoes (id) values ('singleton') on conflict (id) do nothing;

alter table configuracoes enable row level security;
drop policy if exists config_sel on configuracoes;
create policy config_sel on configuracoes for select to authenticated using (true);
drop policy if exists config_wr on configuracoes;
create policy config_wr on configuracoes for all to authenticated
  using (fn_papel_atual() in ('admin','gestor')) with check (fn_papel_atual() in ('admin','gestor'));

alter table resgates add column if not exists iof_retido numeric(20,2) not null default 0;
alter table resgates add column if not exists base_iof numeric(20,2) not null default 0;
