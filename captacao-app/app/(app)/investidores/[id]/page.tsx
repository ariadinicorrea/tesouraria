import { computeInvestidorPosicao } from "@/lib/investidor";
import { anualParaMensal } from "@/lib/funding-engine";
import { Card, Stat } from "@/components/ui";
import { InvestidorDetail } from "@/components/investidor-detail";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  noStore();
  const pos = await computeInvestidorPosicao(params.id);
  if (!pos) notFound();
  const { investidor, posicoes, totais, cdiAtual, taxaMediaPonderadaAnual } = pos;
  const taxaMensal = anualParaMensal(taxaMediaPonderadaAnual);
  return (
    <div className="p-8">
      <div className="flex items-center justify-between no-print">
        <Link href="/investidores" className="text-sm text-muted hover:text-ink">← Investidores</Link>
        <div className="flex gap-2">
          <a href="https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores" target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Conferir no BCB</a>
          <Link href={`/investidores/${investidor.id}/relatorio`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Relatório</Link>
          <Link href={`/investidores/${investidor.id}/informe`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Informe IR</Link>
          <Link href={`/investidores/${investidor.id}/mensal`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Posição mensal</Link>
        </div>
      </div>
      <div className="mt-2">
        <div className="eyebrow">{investidor.tipo_pessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{investidor.nome_razao_social}</h1>
        <div className="num mt-1 text-sm text-muted">{investidor.documento}{investidor.data_nascimento ? ` · nasc. ${fmtData(investidor.data_nascimento)}` : ""}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Saldo bruto atual" value={fmtBRL(totais.saldoBruto)} tone="accent" />
        <Stat label="Rendimento acum." value={fmtBRL(totais.rendimento)} tone="accent" />
        <Stat label="IR estimado" value={fmtBRL(totais.irEstimado)} tone="warn" />
        <Stat label="Saldo líquido" value={fmtBRL(totais.saldoLiquido)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total aportado" value={fmtBRL(totais.valorAportado)} />
        <Stat label="Taxa média ponderada" value={`${fmtPct(taxaMediaPonderadaAnual)} a.a.`} hint={`${fmtPct(taxaMensal, 3)} ao mês`} tone="accent" />
        <Stat label="Custo mensal" value={fmtBRL(totais.custoMensal)} tone="warn" />
      </div>

      <Card className="mt-6">
        <div className="border-b px-5 py-3 eyebrow">Aplicações por aporte · posição atualizada (CDI {fmtPct(cdiAtual)})</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Empresa</th><th className="px-5 py-2 font-medium">Instrumento</th>
            <th className="px-5 py-2 font-medium">Data</th><th className="px-5 py-2 text-right font-medium">Valor aportado</th>
            <th className="px-5 py-2 text-right font-medium">Valor atualizado</th><th className="px-5 py-2 text-right font-medium">Rendimento</th>
            <th className="px-5 py-2 text-right font-medium">IR (aliq.)</th><th className="px-5 py-2 text-right font-medium">Líquido</th>
            <th className="px-5 py-2 text-right font-medium">Taxa a.a.</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {posicoes.map((p) => (
              <tr key={p.aporteId} className="border-t">
                <td className="px-5 py-3">{p.empresa}</td>
                <td className="px-5 py-3 text-muted">{p.instrumento}</td>
                <td className="num px-5 py-3 text-muted">{fmtData(p.dataAporte)}</td>
                <td className="num px-5 py-3 text-right">{fmtBRL(p.valorAportado)}</td>
                <td className="num px-5 py-3 text-right font-semibold">{fmtBRL(p.saldoBruto)}</td>
                <td className="num px-5 py-3 text-right text-accent">{fmtBRL(p.rendimento)}</td>
                <td className="num px-5 py-3 text-right text-warn">{fmtBRL(p.irEstimado)} <span className="text-muted">({fmtPct(p.aliquotaIR, 1)})</span></td>
                <td className="num px-5 py-3 text-right font-semibold">{fmtBRL(p.saldoLiquido)}</td>
                <td className="num px-5 py-3 text-right">{fmtPct(p.taxaEfetivaAnual)}</td>
                <td className="px-5 py-3 text-right no-print"><Link href={`/aportes/${p.aporteId}`} className="text-xs text-muted hover:text-ink">Conta corrente →</Link></td>
              </tr>
            ))}
            {posicoes.length === 0 && (<tr><td colSpan={10} className="px-5 py-6 text-center text-muted">Sem aplicações ativas.</td></tr>)}
          </tbody>
        </table>
      </Card>
      <InvestidorDetail investidor={investidor} />
    </div>
  );
}
