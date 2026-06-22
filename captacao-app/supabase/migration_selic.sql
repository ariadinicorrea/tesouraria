create table if not exists selic_historico (
  data_referencia date primary key,
  taxa_anual numeric(12,8) not null
);
alter table selic_historico enable row level security;
drop policy if exists selic_sel on selic_historico;
create policy selic_sel on selic_historico for select to authenticated using (true);
