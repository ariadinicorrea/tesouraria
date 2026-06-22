-- =====================================================================
--  SEED DE DEMONSTRAÇÃO
--  Rode DEPOIS de schema.sql. Idempotente o suficiente para testes.
--  Usa subselects por nome/documento (os IDs são uuid gerados em runtime).
-- =====================================================================

-- CDI vigente (placeholder; /api/cdi/sync atualiza com o valor real do BCB)
insert into cdi_historico (data_referencia, taxa_anual)
values (current_date - 1, 0.1490)
on conflict (data_referencia) do nothing;

-- Valor atual das cotas dos fundos
insert into cotas_valor_historico (empresa_id, data_referencia, valor_cota)
values
  ((select id from empresas where nome = 'Fundo 1'), current_date - 1, 1083.50),
  ((select id from empresas where nome = 'Fundo 2'), current_date - 1, 1042.10)
on conflict (empresa_id, data_referencia) do nothing;

-- Investidores
insert into investidores (nome_razao_social, documento, tipo_pessoa, email, data_ingresso)
values
  ('Aurora Capital Ltda',     '12345678000190', 'PJ', 'contato@auroracap.com', current_date - 400),
  ('Carlos Mendes',           '11122233344',    'PF', 'carlos@email.com',       current_date - 250),
  ('Helena Duarte',           '55566677788',    'PF', 'helena@email.com',       current_date - 120),
  ('Vértice Investimentos SA','98765432000110', 'PJ', 'ri@vertice.com',         current_date - 60)
on conflict (documento) do nothing;

-- Aportes (um por empresa, modalidades variadas)
insert into aportes
  (empresa_id, investidor_id, instrumento_id, data_aporte, valor_aporte,
   tipo_remuneracao, percentual_cdi, quantidade_cotas, valor_cota_aporte, data_vencimento)
values
  ((select id from empresas where nome='Fundo 1'),
   (select id from investidores where documento='12345678000190'),
   (select id from instrumentos_financeiros where nome='Cotas de FIDC'),
   current_date - 380, 1000000, 'percentual_cdi', 1.10, 1000, 1000.00, current_date + 20);

insert into aportes
  (empresa_id, investidor_id, instrumento_id, data_aporte, valor_aporte,
   tipo_remuneracao, percentual_cdi, quantidade_cotas, valor_cota_aporte, data_vencimento)
values
  ((select id from empresas where nome='Fundo 2'),
   (select id from investidores where documento='11122233344'),
   (select id from instrumentos_financeiros where nome='Cotas de FIDC'),
   current_date - 200, 500000, 'percentual_cdi', 1.05, 500, 1000.00, current_date + 200);

insert into aportes
  (empresa_id, investidor_id, instrumento_id, data_aporte, valor_aporte,
   tipo_remuneracao, taxa_valor, periodo_taxa, data_vencimento)
values
  ((select id from empresas where nome='Securitizadora'),
   (select id from investidores where documento='98765432000110'),
   (select id from instrumentos_financeiros where nome='Debêntures'),
   current_date - 150, 800000, 'cdi_mais', 0.025, 'anual', current_date + 570);

insert into aportes
  (empresa_id, investidor_id, instrumento_id, data_aporte, valor_aporte,
   tipo_remuneracao, taxa_valor, periodo_taxa, data_vencimento)
values
  ((select id from empresas where nome='Contratos'),
   (select id from investidores where documento='55566677788'),
   (select id from instrumentos_financeiros where nome='Contrato de Mútuo'),
   current_date - 90, 300000, 'fixa', 0.012, 'mensal', current_date + 10);
