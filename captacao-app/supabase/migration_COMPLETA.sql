-- =====================================================================
--  ATUALIZAÇÃO COMPLETA — cria tudo que pode estar faltando.
--  100% seguro rodar mesmo que parte já exista (tudo é "if not exists"
--  ou recriado). Cole no SQL Editor do Supabase e clique em Run.
-- =====================================================================

-- 1) Investidores: nascimento + conta bancária
alter table investidores add column if not exists data_nascimento date;
alter table investidores add column if not exists banco text;
alter table investidores add column if not exists agencia text;
alter table investidores add column if not exists conta text;
alter table investidores add column if not exists chave_pix text;

-- 2) Agentes captadores
create table if not exists agentes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null, documento text, email text, telefone text,
  comissao_padrao numeric(12,8) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table agentes alter column comissao_padrao type numeric(12,8);
alter table aportes add column if not exists agente_id uuid references agentes(id);
alter table aportes add column if not exists comissao_percentual numeric(12,8);
alter table aportes alter column comissao_percentual type numeric(12,8);

-- 3) Resgates: situação + IOF
alter table resgates add column if not exists status text not null default 'efetuado';
alter table resgates add column if not exists efetuado_em timestamptz;
alter table resgates add column if not exists iof_retido numeric(20,2) not null default 0;
alter table resgates add column if not exists base_iof numeric(20,2) not null default 0;

-- 4) Configurações (logo)
create table if not exists configuracoes (
  id text primary key default 'singleton', logo_data_url text,
  updated_at timestamptz not null default now()
);
insert into configuracoes (id) values ('singleton') on conflict (id) do nothing;

-- 5) Cautelas / emissões + vínculo no aporte
create table if not exists cautelas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id),
  serie text not null,
  quantidade_emitida numeric(20,4) not null default 0,
  valor_unitario numeric(20,2) not null default 0,
  vencimento date, ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table aportes add column if not exists cautela_id uuid references cautelas(id);

-- 6) Comissões (fechamento)
create table if not exists comissoes (
  id uuid primary key default uuid_generate_v4(),
  aporte_id uuid not null references aportes(id) unique,
  agente_id uuid references agentes(id),
  competencia date not null,
  base_valor numeric(20,2) not null default 0,
  percentual numeric(12,8) not null default 0,
  valor numeric(20,2) not null default 0,
  status text not null default 'pendente',
  pago_em timestamptz, created_at timestamptz not null default now()
);

-- 7) Usuários (perfis): email
alter table perfis add column if not exists email text;

-- 8) Segurança (RLS) das tabelas novas
alter table agentes      enable row level security;
alter table configuracoes enable row level security;
alter table cautelas     enable row level security;
alter table comissoes    enable row level security;

drop policy if exists agentes_sel on agentes;
create policy agentes_sel on agentes for select to authenticated using (true);
drop policy if exists agentes_wr on agentes;
create policy agentes_wr on agentes for all to authenticated using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));

drop policy if exists config_sel on configuracoes;
create policy config_sel on configuracoes for select to authenticated using (true);
drop policy if exists config_wr on configuracoes;
create policy config_wr on configuracoes for all to authenticated using (fn_papel_atual() in ('admin','gestor')) with check (fn_papel_atual() in ('admin','gestor'));

drop policy if exists cautelas_sel on cautelas;
create policy cautelas_sel on cautelas for select to authenticated using (true);
drop policy if exists cautelas_wr on cautelas;
create policy cautelas_wr on cautelas for all to authenticated using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));

drop policy if exists comissoes_sel on comissoes;
create policy comissoes_sel on comissoes for select to authenticated using (true);
drop policy if exists comissoes_wr on comissoes;
create policy comissoes_wr on comissoes for all to authenticated using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));

-- 9) Auditoria das tabelas novas
drop trigger if exists trg_aud_agentes on agentes;
create trigger trg_aud_agentes after insert or update or delete on agentes for each row execute function fn_auditoria();
drop trigger if exists trg_aud_cautelas on cautelas;
create trigger trg_aud_cautelas after insert or update or delete on cautelas for each row execute function fn_auditoria();
drop trigger if exists trg_aud_comissoes on comissoes;
create trigger trg_aud_comissoes after insert or update or delete on comissoes for each row execute function fn_auditoria();
