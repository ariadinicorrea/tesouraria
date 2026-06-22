-- =====================================================================
--  SISTEMA DE GESTÃO DE CAPTAÇÕES, INVESTIDORES E TAXA MÉDIA
--  Banco de dados: PostgreSQL / Supabase
--
--  Convenções:
--   - Taxas armazenadas como fração decimal (0.012 = 1,20%; 0.1065 = 10,65%)
--   - CDI sempre em base anual 252 dias úteis (padrão B3/ANBIMA)
--   - percentual_cdi armazenado como múltiplo (1.10 = 110% do CDI)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
--  ENUMS
-- =====================================================================
create type tipo_empresa        as enum ('fidc', 'securitizadora', 'contratos');
create type tipo_pessoa         as enum ('PF', 'PJ');
create type tipo_remuneracao    as enum ('fixa', 'cdi_mais', 'percentual_cdi');
create type periodo_taxa        as enum ('mensal', 'anual');
create type regime_tributario   as enum ('fixo_15', 'regressivo', 'isento');
create type status_aporte       as enum ('ativo', 'resgatado_total', 'vencido', 'cancelado');
create type tipo_resgate        as enum ('parcial', 'total', 'apenas_juros', 'cotas');
create type papel_usuario       as enum ('admin', 'gestor', 'operador', 'leitura');

-- =====================================================================
--  EMPRESAS  (Fundo 1, Fundo 2, Securitizadora, Contratos)
--  O 'tipo' define o comportamento (cotas x saldo) e o regime padrão.
-- =====================================================================
create table empresas (
  id                 uuid primary key default uuid_generate_v4(),
  nome               text not null,
  tipo               tipo_empresa not null,
  cnpj               text,
  regime_tributario  regime_tributario not null,   -- padrão da empresa
  ativo              boolean not null default true,
  created_at         timestamptz not null default now()
);

-- =====================================================================
--  INSTRUMENTOS FINANCEIROS
--  isento_ir = true  -> Contrato de Mútuo (sobrepõe regime da empresa)
--  baseado_em_cotas = true -> Cotas de FIDC
-- =====================================================================
create table instrumentos_financeiros (
  id               uuid primary key default uuid_generate_v4(),
  nome             text not null unique,
  isento_ir        boolean not null default false,
  baseado_em_cotas boolean not null default false,
  created_at       timestamptz not null default now()
);

-- =====================================================================
--  INVESTIDORES
-- =====================================================================
create table investidores (
  id                 uuid primary key default uuid_generate_v4(),
  nome_razao_social  text not null,
  documento          text not null,            -- CPF ou CNPJ (apenas dígitos)
  tipo_pessoa        tipo_pessoa not null,
  email              text,
  telefone           text,
  data_cadastro      date not null default current_date,
  data_ingresso      date,
  observacoes        text,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index idx_investidores_documento on investidores (documento);

-- =====================================================================
--  HISTÓRICO DO CDI  (atualização periódica)
-- =====================================================================
create table cdi_historico (
  id              uuid primary key default uuid_generate_v4(),
  data_referencia date not null unique,
  taxa_anual      numeric(10,6) not null,   -- ex: 0.106500 = 10,65% a.a. (252)
  created_at      timestamptz not null default now()
);

-- =====================================================================
--  HISTÓRICO DO VALOR DA COTA (apenas FIDC)
-- =====================================================================
create table cotas_valor_historico (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresas(id),
  data_referencia date not null,
  valor_cota      numeric(20,8) not null,
  created_at      timestamptz not null default now(),
  unique (empresa_id, data_referencia)
);

-- =====================================================================
--  APORTES
-- =====================================================================
create table aportes (
  id                uuid primary key default uuid_generate_v4(),
  empresa_id        uuid not null references empresas(id),
  investidor_id     uuid not null references investidores(id),
  instrumento_id    uuid not null references instrumentos_financeiros(id),
  data_aporte       date not null,
  valor_aporte      numeric(20,2) not null check (valor_aporte > 0),

  tipo_remuneracao  tipo_remuneracao not null,
  -- 'fixa'      -> taxa_valor + periodo_taxa  (ex: 0.012 mensal | 0.14 anual)
  -- 'cdi_mais'  -> taxa_valor + periodo_taxa  (spread, ex: 0.02 anual)
  -- 'percentual_cdi' -> percentual_cdi        (ex: 1.10 = 110%)
  taxa_valor        numeric(12,6),
  periodo_taxa      periodo_taxa,
  percentual_cdi    numeric(8,4),

  data_vencimento   date,

  -- Específico FIDC (baseado em cotas)
  quantidade_cotas  numeric(20,8),
  valor_cota_aporte numeric(20,8),

  status            status_aporte not null default 'ativo',
  observacoes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint chk_remuneracao check (
    (tipo_remuneracao = 'fixa'           and taxa_valor is not null and periodo_taxa is not null) or
    (tipo_remuneracao = 'cdi_mais'       and taxa_valor is not null and periodo_taxa is not null) or
    (tipo_remuneracao = 'percentual_cdi' and percentual_cdi is not null)
  )
);
create index idx_aportes_empresa     on aportes (empresa_id);
create index idx_aportes_investidor  on aportes (investidor_id);
create index idx_aportes_status      on aportes (status);
create index idx_aportes_vencimento  on aportes (data_vencimento);

-- =====================================================================
--  RESGATES
-- =====================================================================
create table resgates (
  id                          uuid primary key default uuid_generate_v4(),
  aporte_id                   uuid not null references aportes(id),
  data_resgate                date not null,
  tipo_resgate                tipo_resgate not null,
  valor_solicitado            numeric(20,2),     -- parcial/total/juros
  quantidade_cotas_resgatadas numeric(20,8),     -- FIDC
  valor_bruto                 numeric(20,2) not null,
  base_calculo_ir             numeric(20,2) not null default 0,
  aliquota_ir                 numeric(8,4)  not null default 0,
  ir_retido                   numeric(20,2) not null default 0,
  valor_liquido               numeric(20,2) not null,
  prazo_dias                  integer,
  observacoes                 text,
  created_at                  timestamptz not null default now()
);
create index idx_resgates_aporte on resgates (aporte_id);

-- =====================================================================
--  SNAPSHOTS DIÁRIOS DE POSIÇÃO  (accrual histórico, base de relatórios
--  e do cálculo de taxa média ponderada por saldo atualizado)
-- =====================================================================
create table posicao_snapshots (
  id                   uuid primary key default uuid_generate_v4(),
  aporte_id            uuid not null references aportes(id),
  data_referencia      date not null,
  saldo_principal      numeric(20,2) not null,
  rendimento_dia       numeric(20,2) not null default 0,
  rendimento_acumulado numeric(20,2) not null default 0,
  saldo_bruto          numeric(20,2) not null,
  taxa_efetiva_anual   numeric(12,6) not null,
  unique (aporte_id, data_referencia)
);
create index idx_snapshots_data on posicao_snapshots (data_referencia desc);

-- =====================================================================
--  USUÁRIOS / PERFIS  (integra com Supabase Auth)
-- =====================================================================
create table perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  papel      papel_usuario not null default 'leitura',
  created_at timestamptz not null default now()
);

create or replace function fn_papel_atual() returns papel_usuario
language sql stable security definer as $$
  select papel from perfis where id = auth.uid();
$$;

-- =====================================================================
--  AUDITORIA  (preenchida automaticamente por trigger)
-- =====================================================================
create table auditoria (
  id                uuid primary key default uuid_generate_v4(),
  usuario_id        uuid,
  usuario_email     text,
  operacao          text not null,        -- INSERT / UPDATE / DELETE
  entidade          text not null,
  entidade_id       uuid,
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  data_hora         timestamptz not null default now()
);
create index idx_auditoria_data on auditoria (data_hora desc);

create or replace function fn_auditoria()
returns trigger language plpgsql security definer as $$
declare
  v_uid   uuid;
  v_email text;
begin
  begin v_uid := auth.uid(); exception when others then v_uid := null; end;
  begin
    v_email := current_setting('request.jwt.claims', true)::json ->> 'email';
  exception when others then v_email := null; end;

  insert into auditoria(usuario_id, usuario_email, operacao, entidade,
                        entidade_id, dados_anteriores, dados_novos)
  values (
    v_uid, v_email, tg_op, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;

-- Anexa auditoria às tabelas transacionais
create trigger trg_aud_aportes      after insert or update or delete on aportes      for each row execute function fn_auditoria();
create trigger trg_aud_resgates     after insert or update or delete on resgates     for each row execute function fn_auditoria();
create trigger trg_aud_investidores after insert or update or delete on investidores for each row execute function fn_auditoria();
create trigger trg_aud_cdi          after insert or update or delete on cdi_historico for each row execute function fn_auditoria();
create trigger trg_aud_cotas        after insert or update or delete on cotas_valor_historico for each row execute function fn_auditoria();
create trigger trg_aud_empresas     after insert or update or delete on empresas     for each row execute function fn_auditoria();

-- =====================================================================
--  VIEWS DE APOIO
-- =====================================================================
-- Última posição conhecida de cada aporte (a partir dos snapshots)
create or replace view vw_posicao_atual as
select distinct on (s.aporte_id)
  s.aporte_id, s.data_referencia, s.saldo_principal,
  s.rendimento_acumulado, s.saldo_bruto, s.taxa_efetiva_anual
from posicao_snapshots s
order by s.aporte_id, s.data_referencia desc;

-- Taxa média ponderada por empresa
create or replace view vw_taxa_media_empresa as
select e.id as empresa_id, e.nome, e.tipo,
  sum(p.saldo_bruto)                              as saldo_total,
  case when sum(p.saldo_bruto) > 0
       then sum(p.saldo_bruto * p.taxa_efetiva_anual) / sum(p.saldo_bruto)
       else 0 end                                 as taxa_media_anual,
  count(*)                                        as qtd_aportes
from vw_posicao_atual p
join aportes  a on a.id = p.aporte_id and a.status = 'ativo'
join empresas e on e.id = a.empresa_id
group by e.id, e.nome, e.tipo;

-- Taxa média ponderada consolidada do grupo
create or replace view vw_taxa_media_consolidada as
select
  sum(p.saldo_bruto) as saldo_total,
  case when sum(p.saldo_bruto) > 0
       then sum(p.saldo_bruto * p.taxa_efetiva_anual) / sum(p.saldo_bruto)
       else 0 end as taxa_media_anual
from vw_posicao_atual p
join aportes a on a.id = p.aporte_id and a.status = 'ativo';

-- =====================================================================
--  RLS  (Row Level Security)
--  Leitura: qualquer usuário autenticado. Escrita: admin/gestor/operador.
-- =====================================================================
alter table empresas               enable row level security;
alter table instrumentos_financeiros enable row level security;
alter table investidores           enable row level security;
alter table cdi_historico          enable row level security;
alter table cotas_valor_historico  enable row level security;
alter table aportes                enable row level security;
alter table resgates               enable row level security;
alter table posicao_snapshots      enable row level security;
alter table auditoria              enable row level security;
alter table perfis                 enable row level security;

-- Padrão aplicado às tabelas operacionais (repita o bloco por tabela):
do $$
declare t text;
begin
  foreach t in array array['empresas','instrumentos_financeiros','investidores',
                           'cdi_historico','cotas_valor_historico','aportes',
                           'resgates','posicao_snapshots'] loop
    execute format('create policy %I_sel on %I for select to authenticated using (true);', t, t);
    execute format($p$create policy %1$I_wr on %1$I for all to authenticated
                     using (fn_papel_atual() in ('admin','gestor','operador'))
                     with check (fn_papel_atual() in ('admin','gestor','operador'));$p$, t);
  end loop;
end $$;

-- Auditoria: somente leitura para admin/gestor (inserção via trigger security definer)
create policy auditoria_sel on auditoria for select to authenticated
  using (fn_papel_atual() in ('admin','gestor'));

-- Perfis: cada um vê o próprio; admin gerencia todos
create policy perfis_self on perfis for select to authenticated using (id = auth.uid() or fn_papel_atual() = 'admin');
create policy perfis_admin on perfis for all to authenticated
  using (fn_papel_atual() = 'admin') with check (fn_papel_atual() = 'admin');

-- =====================================================================
--  SEED INICIAL
-- =====================================================================
insert into empresas (nome, tipo, regime_tributario) values
  ('Fundo 1',         'fidc',           'fixo_15'),
  ('Fundo 2',         'fidc',           'fixo_15'),
  ('Securitizadora',  'securitizadora', 'regressivo'),
  ('Contratos',       'contratos',      'isento');

insert into instrumentos_financeiros (nome, isento_ir, baseado_em_cotas) values
  ('Cotas de FIDC',     false, true),
  ('Debêntures',        false, false),
  ('Nota Comercial',    false, false),
  ('Contrato de Mútuo', true,  false),
  ('Outros',            false, false);

-- ===== Adições v3 (data de nascimento, agentes, comissões) =====
alter table investidores add column if not exists data_nascimento date;
create table if not exists agentes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null, documento text, email text, telefone text,
  comissao_padrao numeric(8,4) not null default 0, ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table aportes add column if not exists agente_id uuid references agentes(id);
alter table aportes add column if not exists comissao_percentual numeric(8,4);
alter table agentes enable row level security;
drop policy if exists agentes_sel on agentes;
create policy agentes_sel on agentes for select to authenticated using (true);
drop policy if exists agentes_wr on agentes;
create policy agentes_wr on agentes for all to authenticated
  using (fn_papel_atual() in ('admin','gestor','operador'))
  with check (fn_papel_atual() in ('admin','gestor','operador'));
drop trigger if exists trg_aud_agentes on agentes;
create trigger trg_aud_agentes after insert or update or delete on agentes for each row execute function fn_auditoria();
alter table investidores add column if not exists banco text;
alter table investidores add column if not exists agencia text;
alter table investidores add column if not exists conta text;
alter table investidores add column if not exists chave_pix text;
alter table resgates add column if not exists status text not null default 'efetuado';
alter table resgates add column if not exists efetuado_em timestamptz;
create table if not exists configuracoes (id text primary key default 'singleton', logo_data_url text, updated_at timestamptz not null default now());
insert into configuracoes (id) values ('singleton') on conflict (id) do nothing;
alter table configuracoes enable row level security;
drop policy if exists config_sel on configuracoes;
create policy config_sel on configuracoes for select to authenticated using (true);
drop policy if exists config_wr on configuracoes;
create policy config_wr on configuracoes for all to authenticated using (fn_papel_atual() in ('admin','gestor')) with check (fn_papel_atual() in ('admin','gestor'));
alter table resgates add column if not exists iof_retido numeric(20,2) not null default 0;
alter table resgates add column if not exists base_iof numeric(20,2) not null default 0;
create table if not exists cautelas (id uuid primary key default uuid_generate_v4(), empresa_id uuid not null references empresas(id), serie text not null, quantidade_emitida numeric(20,4) not null default 0, valor_unitario numeric(20,2) not null default 0, vencimento date, ativo boolean not null default true, created_at timestamptz not null default now());
alter table aportes add column if not exists cautela_id uuid references cautelas(id);
alter table agentes alter column comissao_padrao type numeric(12,8);
alter table aportes alter column comissao_percentual type numeric(12,8);
create table if not exists comissoes (id uuid primary key default uuid_generate_v4(), aporte_id uuid not null references aportes(id) unique, agente_id uuid references agentes(id), competencia date not null, base_valor numeric(20,2) not null default 0, percentual numeric(12,8) not null default 0, valor numeric(20,2) not null default 0, status text not null default 'pendente', pago_em timestamptz, created_at timestamptz not null default now());
alter table comissoes enable row level security;
drop policy if exists comissoes_sel on comissoes; create policy comissoes_sel on comissoes for select to authenticated using (true);
drop policy if exists comissoes_wr on comissoes; create policy comissoes_wr on comissoes for all to authenticated using (fn_papel_atual() in ('admin','gestor','operador')) with check (fn_papel_atual() in ('admin','gestor','operador'));
alter table perfis add column if not exists email text;
alter table aportes add column if not exists codigo text;
create table if not exists selic_historico (
  data_referencia date primary key,
  taxa_anual numeric(12,8) not null
);
alter table selic_historico enable row level security;
drop policy if exists selic_sel on selic_historico;
create policy selic_sel on selic_historico for select to authenticated using (true);
