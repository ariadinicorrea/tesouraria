import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeAportesAtivos } from "@/lib/aporte";
import { listarCotasComValor } from "@/lib/cotas-fundos";
import { Card, Stat } from "@/components/ui";
import { NovoAporte } from "@/components/novo-aporte";
import { Tabela, type Coluna } from "@/components/tabela";
import { fmtBRL } from "@/lib/format";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function AportesPage({ searchParams }: { searchParams: { investidor?: string; empresa?: string; de?: string; ate?: string; codigo?: string; todos?: string } }) {
  noStore();
  const invFiltro = searchParams?.investidor || "";
  const empFiltro = searchParams?.empresa || "";
  const deFiltro = searchParams?.de || "";
  const ateFiltro = searchParams?.ate || "";
  const codigoFiltro = (searchParams?.codigo || "").trim();
  const verTodos = searchParams?.todos === "1";

  const temFiltro = !!(invFiltro || empFiltro || deFiltro || ateFiltro || codigoFiltro || verTodos);

  const [empresasRes, investidoresRes, instrumentosRes, agentesRes, cautelasRes] = await Promise.all([
    supabaseAdmin.from("empresas").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabaseAdmin.from("investidores").select("id, nome_razao_social").order("nome_razao_social"),
    supabaseAdmin.from("instrumentos_financeiros").select("id, nome, baseado_em_cotas").order("nome"),
    supabaseAdmin.from("agentes").select("id, nome, comissao_padrao").eq("ativo", true).order("nome"),
    supabaseAdmin.from("cautelas").select("id, empresa_id, serie, codigo, valor").eq("status", "disponivel").order("codigo"),
  ]);
  const cotas = await listarCotasComValor();

  const ativos = temFiltro ? await computeAportesAtivos() : [];

  const filtrados = ativos.filter((a) => {
    if (invFiltro && a.investidorId !== invFiltro) return false;
    if (empFiltro && a.empresaId !== empFiltro) return false;
    if (deFiltro && String(a.dataAporte).slice(0, 10) < deFiltro) return false;
    if (ateFiltro && String(a.dataAporte).slice(0, 10) > ateFiltro) return false;
    if (codigoFiltro && !String(a.codigo ?? "").toLowerCase().includes(codigoFiltro.toLowerCase())) return false;
    return true;
  });

  const totAportado = filtrados.reduce((s, a) => s + a.valorAportado, 0);
  const totSaldo = filtrados.reduce((s, a) => s + a.saldoBruto, 0);
  const totCusto = filtrados.reduce((s, a) => s + a.rendimento, 0);

  const linhas = filtrados.map((a) => ({
    id: a.aporteId, codigo: a.codigo || "—", data_aporte: a.dataAporte, empresa: a.empresa, investidor: a.investidor,
    remuneracao: a.remuneracao, valorAportado: a.valorAportado, taxaEf: a.taxaEf, saldoBruto: a.saldoBruto, rendimento: a.rendimento,
  }));
  const colunas: Coluna[] = [
    { chave: "codigo", rotulo: "Código" },
    { chave: "data_aporte", rotulo: "Data", tipo: "data" },
    { chave: "empresa", rotulo: "Empresa" },
    { chave: "investidor", rotulo: "Investidor" },
    { chave: "remuneracao", rotulo: "Remuneração" },
    { chave: "valorAportado", rotulo: "Aportado", tipo: "moeda", align: "right" },
    { chave: "taxaEf", rotulo: "Taxa efet. a.a.", tipo: "pct", align: "right" },
    { chave: "saldoBruto", rotulo: "Saldo hoje", tipo: "moeda", align: "right" },
    { chave: "rendimento", rotulo: "Custo acum.", tipo: "moeda", align: "right" },
    { chave: "ed", rotulo: "", links: [{ rotulo: "Editar", base: "/aportes/", sufixo: "/editar" }, { rotulo: "Conta corrente →", base: "/aportes/" }] },
    { chave: "del", rotulo: "", acao: { rotulo: "Excluir", base: "/api/aportes/", metodo: "DELETE", confirmar: "Excluir este aporte? Não dá pra desfazer." } },
  ];

  const inputCls = "rounded-md border bg-surface px-3 py-1.5 text-sm";

  return (
    <div className="p-8">
      <header><div className="eyebrow">Operações</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Aportes</h1></header>
      <div className="mt-6"><NovoAporte empresas={empresasRes.data ?? []} investidores={investidoresRes.data ?? []} instrumentos={instrumentosRes.data ?? []} agentes={(agentesRes.data ?? []) as any} cautelas={(cautelasRes.data ?? []) as any} cotas={cotas as any} /></div>

      <Card className="mt-6">
        <div className="border-b px-5 py-3">
          <div className="eyebrow">Consultar aportes</div>
          <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-muted">Empresa
              <select name="empresa" defaultValue={empFiltro} className={inputCls}>
                <option value="">Todas</option>
                {(empresasRes.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-xs text-muted">Investidor
              <select name="investidor" defaultValue={invFiltro} className={inputCls}>
                <option value="">Todos</option>
                {(investidoresRes.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.nome_razao_social}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-xs text-muted">De
              <input type="date" name="de" defaultValue={deFiltro} className={inputCls} />
            </label>
            <label className="flex flex-col text-xs text-muted">Até
              <input type="date" name="ate" defaultValue={ateFiltro} className={inputCls} />
            </label>
            <label className="flex flex-col text-xs text-muted">Código
              <input type="text" name="codigo" defaultValue={codigoFiltro} placeholder="ex: CTR-001" className={inputCls} />
            </label>
            <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white">Filtrar</button>
            <button type="submit" name="todos" value="1" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Mostrar todos</button>
            {temFiltro && <a href="/aportes" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Limpar</a>}
          </form>
        </div>

        {!temFiltro ? (
          <div className="px-5 py-12 text-center text-muted">
            <p className="text-sm">Use os filtros acima e clique em <b>Filtrar</b> para consultar os aportes.</p>
            <p className="mt-1 text-xs">Ou clique em <b>Mostrar todos</b> para ver a carteira completa (pode levar alguns segundos).</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
              <Stat label="Total aportado" value={fmtBRL(totAportado)} hint={`${filtrados.length} aporte(s)`} />
              <Stat label="Saldo bruto hoje" value={fmtBRL(totSaldo)} tone="accent" />
              <Stat label="Custo acumulado" value={fmtBRL(totCusto)} tone="warn" hint="rendimento já corrido até hoje" />
            </div>
            <Tabela colunas={colunas} linhas={linhas} vazio="Nenhum aporte encontrado para esse filtro." />
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">O <b>custo</b> é o rendimento bruto já corrido de cada captação até hoje (base 252 dias úteis, CDI vigente). Clique nos cabeçalhos para ordenar.</p>
    </div>
  );
}
