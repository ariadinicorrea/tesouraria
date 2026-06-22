-- Mais precisão para comissões pequenas (ex.: 0,02% = 0,0002)
alter table agentes alter column comissao_padrao type numeric(12,8);
alter table aportes alter column comissao_percentual type numeric(12,8);
