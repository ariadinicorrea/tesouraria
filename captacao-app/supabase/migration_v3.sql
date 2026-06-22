-- =====================================================================
--  MIGRAÇÃO v3 — data de nascimento, agentes captadores e comissões
--  Rode no SQL Editor do Supabase (depois do schema.sql). É idempotente.
-- =====================================================================

-- Data de nascimento do investidor (para aniversários)
alter table investidores add column if not exists data_nascimento date;

-- Agentes captadores
create table if not exists agentes (
  id              uuid primary key default uuid_generate_v4(),
  nome            text not null,
  documento       text,
  email           text,
  telefone        text,
  comissao_padrao numeric(8,4) not null default 0,  -- fração: 0.02 = 2% sobre o aporte
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Vínculo do agente no aporte + comissão (override opcional)
alter table aportes add column if not exists agente_id uuid references agentes(id);
alter table aportes add column if not exists comissao_percentual numeric(8,4);

-- RLS de agentes (mesmo padrão das demais tabelas)
alter table agentes enable row level security;
drop policy if exists agentes_sel on agentes;
create policy agentes_sel on agentes for select to authenticated using (true);
drop policy if exists agentes_wr on agentes;
create policy agentes_wr on agentes for all to authenticated
  using (fn_papel_atual() in ('admin','gestor','operador'))
  with check (fn_papel_atual() in ('admin','gestor','operador'));

-- Auditoria do agente
drop trigger if exists trg_aud_agentes on agentes;
create trigger trg_aud_agentes after insert or update or delete on agentes
  for each row execute function fn_auditoria();

-- Conta para depósito do investidor
alter table investidores add column if not exists banco text;
alter table investidores add column if not exists agencia text;
alter table investidores add column if not exists conta text;
alter table investidores add column if not exists chave_pix text;
