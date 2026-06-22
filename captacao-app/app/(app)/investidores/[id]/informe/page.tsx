import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeInvestidorPosicao } from "@/lib/investidor";
import { getLogo } from "@/lib/config";
import { PrintButton } from "@/components/print-button";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function Informe({ params, searchParams }: { params: { id: string }; searchParams: { ano?: string } }) {
  const anoAtual = new Date().getFullYear();
  const ano = searchParams?.ano ? Number(searchParams.ano) : anoAtual - 1;
  const pos = await computeInvestidorPosicao(params.id);
  if (!pos) notFound();
  const { investidor, totais } = pos;
  const logo = await getLogo();

  const { data: resgates } = await supabaseAdmin.from("resgates")
    .select("data_resgate, valor_bruto, base_iof, ir_retido, iof_retido, aliquota_ir, aportes!inner(investidor_id, empresas(nome))")
    .eq("aportes.investidor_id", params.id).eq("status", "efetuado")
    .gte("data_resgate", `${ano}-01-01`).lte("data_resgate", `${ano}-12-31`).order("data_resgate");

  const linhas = (resgates ?? []) as any[];
  const totRend = linhas.reduce((s, r) => s + Number(r.base_iof), 0);
  const totIr = linhas.reduce((s, r) => s + Number(r.ir_retido), 0);
  const totIof = linhas.reduce((s, r) => s + Number(r.iof_retido ?? 0), 0);
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between no-print">
        <Link href={`/investidores/${params.id}`} className="text-sm text-muted hover:text-ink">← Voltar</Link>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <select name="ano" defaultValue={ano} className="rounded-md border bg-surface px-3 py-2 text-sm">{anos.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-paper">Ver</button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
            <div><div className="text-lg font-semibold tracking-tight">Informe de Rendimentos {ano}</div><div className="text-sm text-muted">Para declaração de Imposto de Renda</div></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted">Investidor:</span> <b>{investidor.nome_razao_social}</b></div>
          <div><span className="text-muted">Documento:</span> <span className="num">{investidor.documento}</span></div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">Rendimentos no ano</div><div className="num mt-1 font-semibold text-accent">{fmtBRL(totRend)}</div></div>
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">IRRF retido</div><div className="num mt-1 font-semibold text-warn">{fmtBRL(totIr)}</div></div>
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">IOF retido</div><div className="num mt-1 font-semibold text-warn">{fmtBRL(totIof)}</div></div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted">
            <th className="py-2 font-medium">Data</th><th className="py-2 font-medium">Empresa</th>
            <th className="py-2 text-right font-medium">Rendimento</th><th className="py-2 text-right font-medium">IOF</th>
            <th className="py-2 text-right font-medium">IRRF</th>
          </tr></thead>
          <tbody>
            {linhas.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="num py-2">{fmtData(r.data_resgate)}</td><td className="py-2 text-muted">{r.aportes?.empresas?.nome}</td>
                <td className="num py-2 text-right text-accent">{fmtBRL(Number(r.base_iof))}</td>
                <td className="num py-2 text-right">{fmtBRL(Number(r.iof_retido ?? 0))}</td>
                <td className="num py-2 text-right text-warn">{fmtBRL(Number(r.ir_retido))}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted">Nenhum rendimento resgatado em {ano}.</td></tr>}
          </tbody>
        </table>
        <div className="mt-4 text-sm text-muted">Posição em aberto atual (ainda não resgatada): saldo corrigido <b className="num text-ink">{fmtBRL(totais.saldoBruto)}</b>.</div>
        <p className="mt-6 text-[0.7rem] leading-relaxed text-muted">Documento informativo. Os rendimentos acima referem-se a valores resgatados no ano (tributados na fonte). Rendimentos de aplicações em aberto são tributados no resgate. Contratos de mútuo: isentos de IR. Confira com sua contabilidade antes da declaração.</p>
      </div>
    </div>
  );
}
