import { computeAportesAtivos } from "@/lib/aporte";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NovoResgate } from "@/components/novo-resgate";
import { Card } from "@/components/ui";
import { Tabela, type Coluna } from "@/components/tabela";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function ResgatesPage({ searchParams }: { searchParams: { investidor?: string; empresa?: string } }) {
  noStore();
  const invFiltro = searchParams?.investidor || "";
  const empFiltro = searchParams?.empresa || "";
  const [aportes, investidoresRes, empresasRes] = await Promise.all([
    computeAportesAtivos(),
    supabaseAdmin.from("investidores").select("id, nome_razao_social").order("nome_razao_social"),
    supabaseAdmin.from("empresas").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const { data: cautelasVendidas } = await supabaseAdmin.from("cautelas").select("id, aporte_id, codigo, serie, valor").eq("status", "vendida");
  const cautelasPorAporte: Record<string, any[]> = {};
  for (const c of (cautelasVendidas ?? [])) { if (!c.aporte_id) continue; (cautelasPorAporte[c.aporte_id] ||= []).push(c); }
  let q = supabaseAdmin.from("resgates")
    .select("*, aportes!inner(investidor_id, empresa_id, investidores(nome_razao_social), empresas(nome))")
    .order("data_resgate", { ascending: false });
  if (invFiltro) q = q.eq("aportes.investidor_id", invFiltro);
  if (empFiltro) q = q.eq("aportes.empresa_id", empFiltro);
  const { data: historico } = await q;

  const linhas = (historico ?? []).map((r: any) => ({
    id: r.id, data_resgate: r.data_resgate,
    empresa_nome: r.aportes?.empresas?.nome ?? "—",
    investidor_nome: r.aportes?.investidores?.nome_razao_social ?? "—",
    tipo_resgate: r.tipo_resgate, status: r.status,
    valor_bruto: Number(r.valor_bruto), ir_retido: Number(r.ir_retido), valor_liquido: Number(r.valor_liquido),
  }));
  const colunas: Coluna[] = [
    { chave: "data_resgate", rotulo: "Data", tipo: "data" },
    { chave: "empresa_nome", rotulo: "Empresa" },
    { chave: "investidor_nome", rotulo: "Investidor" },
    { chave: "tipo_resgate", rotulo: "Tipo" },
    { chave: "status", rotulo: "Situação", tipo: "status" },
    { chave: "valor_bruto", rotulo: "Bruto", tipo: "moeda", align: "right" },
    { chave: "ir_retido", rotulo: "IR", tipo: "moeda", align: "right" },
    { chave: "valor_liquido", rotulo: "Líquido", tipo: "moeda", align: "right" },
    { chave: "acoes", rotulo: "", links: [{ rotulo: "Comprovante →", base: "/resgates/", sufixo: "/comprovante" }] },
  ];
  return (
    <div className="p-8">
      <header><div className="eyebrow">Operações</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Resgates</h1></header>
      <div className="mt-6"><NovoResgate cautelasPorAporte={cautelasPorAporte} aportes={aportes} /></div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-3">
          <div className="eyebrow">Histórico de resgates</div>
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
            {(invFiltro || empFiltro) && <a href="/resgates" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Limpar</a>}
          </form>
        </div>
        <Tabela colunas={colunas} linhas={linhas} vazio="Nenhum resgate encontrado." />
      </Card>
    </div>
  );
}
