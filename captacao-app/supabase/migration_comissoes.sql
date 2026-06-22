-- =====================================================================
--  Comissões geradas (fechamento mensal) — controle de pagas/pendentes
-- =====================================================================
create table if not exists comissoes (
  id          uuid primary key default uuid_generate_v4(),
  aporte_id   uuid not null references aportes(id) unique,
  agente_id   uuid references agentes(id),
  competencia date not null,
  base_valor  numeric(20,2) not null default 0,
  percentual  numeric(12,8) not null default 0,
  valor       numeric(20,2) not null default 0,
  status      text not null default 'pendente',  -- pendente / pago
  pago_em     timestamptz,
  created_at  timestamptz not null default now()
);
alter table comissoes enable row level security;
drop policy if exists comissoes_sel on comissoes;
create policy comissoes_sel on comissoes for select to authenticated using (true);
drop policy if exists comissoes_wr on comissoes;
create policy comissoes_wr on comissoes for all to authenticated
  using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));
drop trigger if exists trg_aud_comissoes on comissoes;
create trigger trg_aud_comissoes after insert or update or delete on comissoes for each row execute function fn_auditoria();
