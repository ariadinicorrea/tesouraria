-- =====================================================================
--  MIGRAÇÃO v6 — cautelas/emissões (debêntures e cotas) + vínculo no aporte
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================
create table if not exists cautelas (
  id                 uuid primary key default uuid_generate_v4(),
  empresa_id         uuid not null references empresas(id),
  serie              text not null,
  quantidade_emitida numeric(20,4) not null default 0,
  valor_unitario     numeric(20,2) not null default 0,
  vencimento         date,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now()
);
alter table aportes add column if not exists cautela_id uuid references cautelas(id);

alter table cautelas enable row level security;
drop policy if exists cautelas_sel on cautelas;
create policy cautelas_sel on cautelas for select to authenticated using (true);
drop policy if exists cautelas_wr on cautelas;
create policy cautelas_wr on cautelas for all to authenticated
  using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));
drop trigger if exists trg_aud_cautelas on cautelas;
create trigger trg_aud_cautelas after insert or update or delete on cautelas for each row execute function fn_auditoria();
