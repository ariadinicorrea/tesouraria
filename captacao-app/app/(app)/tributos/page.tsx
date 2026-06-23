import { computeTributos } from "@/lib/tributos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PrintButton } from "@/components/print-button";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function TributosPage({ searchParams }: { searchParams: { de?: string; ate?: string; investidor?: string } }) {
  noStore();
  const anoAnt = new Date().getFullYear() - 1;
  const de = searchParams?.de || `${anoAnt}-01-01`;
  const ate = searchParams?.ate || `${anoAnt}-12-31`;
  const { data: investidores } = await supabaseAdmin.from("investidores").select("id, nome_razao_social").order("nome_razao_social");
  const { porInvestidor, totalIr, totalIof } = await computeTributos({ de, ate, investidorId: searchParams?.investidor || undefined });

  return (
    <div className="p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Financeiro</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Tributos retidos (IRRF e IOF)</h1></div>
        <PrintButton />
      </header>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 no-print">
        <div><label className="eyebrow">De</label><br/><input type="date" name="de" defaultValue={de} className="rounded-md border bg-surface px-3 py-2 text-sm" /></div>
        <div><label className="eyebrow">Até</label><br/><input type="date" name="ate" defaultValue={ate} className="rounded-md border bg-surface px-3 py-2 text-sm" /></div>
        <div><label className="eyebrow">Investidor</label><br/>
          <select name="investidor" defaultValue={searchParams?.investidor ?? ""} className="rounded-md border bg-surface px-3 py-2 text-sm">
            <option value="">Todos</option>{(investidores ?? []).map((i) => <option key={i.id} value={i.id}>{i.nome_razao_social}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Filtrar</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">Período</div><div className="num mt-1 text-sm font-semibold">{fmtData(de)} a {fmtData(ate)}</div></div>
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">Total IRRF</div><div className="num mt-1 text-2xl font-semibold text-warn">{fmtBRL(totalIr)}</div></div>
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">Total IOF</div><div className="num mt-1 text-2xl font-semibold text-warn">{fmtBRL(totalIof)}</div></div>
      </div>

      {porInvestidor.length === 0 && <p className="mt-6 text-sm text-muted">Nenhum resgate efetuado no período/filtro selecionado.</p>}
      {porInvestidor.map((g) => (
        <div key={g.documento} className="mt-6 rounded-lg border bg-surface">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div><span className="font-medium">{g.investidor}</span> <span className="num text-xs text-muted">{g.documento}</span></div>
            <div className="text-sm"><span className="text-muted">IRRF</span> <b className="num text-warn">{fmtBRL(g.totalIr)}</b> · <span className="text-muted">IOF</span> <b className="num text-warn">{fmtBRL(g.totalIof)}</b></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted">
              <th className="px-5 py-2 font-medium">Data</th><th className="px-5 py-2 font-medium">Empresa</th>
              <th className="px-5 py-2 text-right font-medium">Bruto</th><th className="px-5 py-2 text-right font-medium">IOF</th>
              <th className="px-5 py-2 text-right font-medium">IRRF</th><th className="px-5 py-2 text-right font-medium">Alíq. IR</th>
            </tr></thead>
            <tbody>
              {g.itens.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="num px-5 py-2">{fmtData(it.data)}</td><td className="px-5 py-2 text-muted">{it.empresa}</td>
                  <td className="num px-5 py-2 text-right">{fmtBRL(it.valorBruto)}</td><td className="num px-5 py-2 text-right">{fmtBRL(it.iof)}</td>
                  <td className="num px-5 py-2 text-right text-warn">{fmtBRL(it.ir)}</td><td className="num px-5 py-2 text-right">{fmtPct(it.aliquotaIr, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
