import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeInvestidorPosicao } from "@/lib/investidor";
import { getLogo } from "@/lib/config";
import { PrintButton } from "@/components/print-button";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

function mesAnterior() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear(), m = d.getMonth();
  const ini = new Date(y, m, 1), fim = new Date(y, m + 1, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { ini: iso(ini), fim: iso(fim), rotulo: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
}

export default async function Mensal({ params, searchParams }: { params: { id: string }; searchParams: { ini?: string; fim?: string; rotulo?: string } }) {
  noStore();
  const def = mesAnterior();
  const ini = searchParams?.ini ?? def.ini, fim = searchParams?.fim ?? def.fim, rotulo = searchParams?.rotulo ?? def.rotulo;
  const pos = await computeInvestidorPosicao(params.id);
  if (!pos) notFound();
  const { investidor, posicoes, totais, cdiAtual } = pos;
  const logo = await getLogo();

  const { data: aportesMes } = await supabaseAdmin.from("aportes")
    .select("data_aporte, valor_aporte, empresas(nome)").eq("investidor_id", params.id)
    .gte("data_aporte", ini).lte("data_aporte", fim).order("data_aporte");
  const { data: resgatesMes } = await supabaseAdmin.from("resgates")
    .select("data_resgate, valor_bruto, ir_retido, iof_retido, valor_liquido, tipo_resgate, aportes!inner(investidor_id, empresas(nome))")
    .eq("aportes.investidor_id", params.id).eq("status", "efetuado")
    .gte("data_resgate", ini).lte("data_resgate", fim).order("data_resgate");

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between no-print">
        <Link href={`/investidores/${params.id}`} className="text-sm text-muted hover:text-ink">← Voltar</Link>
        <PrintButton />
      </div>
      <div className="rounded-lg border bg-surface p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
            <div><div className="text-lg font-semibold tracking-tight">Posição Mensal — {rotulo}</div><div className="text-sm text-muted">{investidor.nome_razao_social} · {investidor.documento}</div></div>
          </div>
          <div className="text-right text-xs text-muted">CDI ref.<div className="num text-sm font-semibold text-ink">{fmtPct(cdiAtual)} a.a.</div></div>
        </div>

        {/* Posição atual por aporte/empresa */}
        <div className="mt-5 eyebrow">Posição atual por aporte e empresa</div>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted">
            <th className="py-2 font-medium">Empresa</th><th className="py-2 font-medium">Instrumento</th>
            <th className="py-2 text-right font-medium">Aportado</th><th className="py-2 text-right font-medium">Corrigido</th>
            <th className="py-2 text-right font-medium">Líquido</th><th className="py-2 text-right font-medium">IR%</th>
          </tr></thead>
          <tbody>
            {posicoes.map((p) => (
              <tr key={p.aporteId} className="border-b">
                <td className="py-2">{p.empresa}</td><td className="py-2 text-muted">{p.instrumento}</td>
                <td className="num py-2 text-right">{fmtBRL(p.valorAportado)}</td><td className="num py-2 text-right text-accent">{fmtBRL(p.saldoBruto)}</td>
                <td className="num py-2 text-right">{fmtBRL(p.saldoLiquido)}</td><td className="num py-2 text-right text-warn">{fmtPct(p.aliquotaIR, 1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><td className="py-2" colSpan={3}>Totais</td>
            <td className="num py-2 text-right text-accent">{fmtBRL(totais.saldoBruto)}</td>
            <td className="num py-2 text-right">{fmtBRL(totais.saldoLiquido)}</td><td></td></tr></tfoot>
        </table>

        {/* Movimentações do mês */}
        <div className="mt-6 eyebrow">Movimentações do mês ({rotulo})</div>
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted">Aportes</div>
            {(aportesMes ?? []).length === 0 ? <div className="text-sm text-muted">— nenhum</div> :
              (aportesMes ?? []).map((a: any, i) => <div key={i} className="flex justify-between text-sm"><span>{fmtData(a.data_aporte)} · {a.empresas?.nome}</span><span className="num text-accent">{fmtBRL(Number(a.valor_aporte))}</span></div>)}
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Resgates</div>
            {(resgatesMes ?? []).length === 0 ? <div className="text-sm text-muted">— nenhum</div> :
              (resgatesMes ?? []).map((r: any, i) => <div key={i} className="flex justify-between text-sm"><span>{fmtData(r.data_resgate)} · {r.tipo_resgate}</span><span className="num text-neg">{fmtBRL(Number(r.valor_bruto))}</span></div>)}
          </div>
        </div>
        <p className="mt-6 text-[0.7rem] leading-relaxed text-muted">Posição informativa. "Corrigido" = atualizado pelo CDI de referência; "líquido" = após IR estimado. IR% por aplicação na coluna correspondente (0% = isento).</p>
      </div>
    </div>
  );
}
