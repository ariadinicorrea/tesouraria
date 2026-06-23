import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeAportesAtivos } from "@/lib/aporte";
import { Card, Stat } from "@/components/ui";
import { NovoAporte } from "@/components/novo-aporte";
import { Tabela, type Coluna } from "@/components/tabela";
import { fmtBRL } from "@/lib/format";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AportesPage({ searchParams }: { searchParams: { investidor?: string; empresa?: string } }) {
  const invFiltro = searchParams?.investidor || "";
  const empFiltro = searchParams?.empresa || "";

  const [empresasRes, investidoresRes, instrumentosRes, agentesRes, cautelasRes, ativos] = await Promise.all([
    supabaseAdmin.from("empresas").select("id, nome").eq("ativo", true).order("nome"),
    supabaseAdmin.from("investidores").select("id, nome_razao_social").order("nome_razao_social"),
    supabaseAdmin.from("instrumentos_financeiros").select("id, nome, baseado_em_cotas").order("nome"),
    supabaseAdmin.from("agentes").select("id, nome, comissao_padrao").eq("ativo", true).order("nome"),
    supabaseAdmin.from("cautelas").select("id, empresa_id, serie").eq("ativo", true).order("serie"),
    computeAportesAtivos(),
  ]);

  const filtrados = ativos.filter((a) =>
    (!invFiltro || a.investidorId === invFiltro) && (!empFiltro || a.empresaId === empFiltro));
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
  return (
    <div className="p-8">
      <header><div className="eyebrow">Operações</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Aportes</h1></header>
      <div className="mt-6"><NovoAporte empresas={empresasRes.data ?? []} investidores={investidoresRes.data ?? []} instrumentos={instrumentosRes.data ?? []} agentes={(agentesRes.data ?? []) as any} cautelas={(cautelasRes.data ?? []) as any} /></div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="Total aportado (ativo)" value={fmtBRL(totAportado)} hint={`${filtrados.length} aporte(s)`} />
        <Stat label="Saldo bruto hoje" value={fmtBRL(totSaldo)} tone="accent" />
        <Stat label="Custo acumulado" value={fmtBRL(totCusto)} tone="warn" hint="rendimento já corrido até hoje" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-3">
          <div className="eyebrow">Aportes ativos — com custo</div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <select name="empresa" defaultValue={empFiltro} className="rounded-md border bg-surface px-3 py-1.5 text-sm">
              <option value="">Todas as empresas</option>
              {(empresasRes.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select name="investidor" defaultValue={invFiltro} className="rounded-md border bg-surface px-3 py-1.5 text-sm">
              <option value="">Todos os investidores</option>
              {(investidoresRes.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.nome_razao_social}</option>)}
            </select>
            <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white">Filtrar</button>
            {(invFiltro || empFiltro) && <a href="/aportes" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Limpar</a>}
          </form>
        </div>
        <Tabela colunas={colunas} linhas={linhas} vazio="Nenhum aporte ativo encontrado." />
      </Card>
      <p className="mt-3 text-xs text-muted">O <b>custo</b> é o rendimento bruto já corrido de cada captação até hoje (base 252 dias úteis, CDI vigente). Clique nos cabeçalhos para ordenar.</p>
    </div>
  );
}
