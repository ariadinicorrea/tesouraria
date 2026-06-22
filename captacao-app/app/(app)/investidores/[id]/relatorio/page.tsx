import { computeInvestidorPosicao } from "@/lib/investidor";
import { PrintButton } from "@/components/print-button";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { notFound } from "next/navigation";
import { getLogo } from "@/lib/config";
import Link from "next/link";

export const dynamic = "force-dynamic";
const BCB = "https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores";


export default async function Relatorio({ params }: { params: { id: string } }) {
  const pos = await computeInvestidorPosicao(params.id);
  if (!pos) notFound();
  const { investidor, posicoes, totais, cdiAtual, taxaMediaPonderadaAnual } = pos;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const logo = await getLogo();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between no-print">
        <Link href={`/investidores/${investidor.id}`} className="text-sm text-muted hover:text-ink">← Voltar</Link>
        <div className="flex gap-2">
          <a href={BCB} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Conferir na Calculadora do Cidadão (BCB)</a>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
            <div>
              <div className="text-lg font-semibold tracking-tight">Demonstrativo de Posição</div>
              <div className="text-sm text-muted">Emitido em {hoje}</div>
            </div>
          </div>
          <div className="text-right text-xs text-muted">CDI de referência<div className="num text-sm font-semibold text-ink">{fmtPct(cdiAtual)} a.a.</div></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted">Investidor:</span> <b>{investidor.nome_razao_social}</b></div>
          <div><span className="text-muted">Documento:</span> <span className="num">{investidor.documento}</span></div>
          <div><span className="text-muted">Tipo:</span> {investidor.tipo_pessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}</div>
          <div><span className="text-muted">Ingresso:</span> <span className="num">{fmtData(investidor.data_ingresso)}</span></div>
        </div>

        {/* Os três saldos */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">Saldo bruto (aportado)</div><div className="num mt-1 text-lg font-semibold">{fmtBRL(totais.valorAportado)}</div><div className="text-xs text-muted">capital aplicado</div></div>
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">Saldo corrigido</div><div className="num mt-1 text-lg font-semibold text-accent">{fmtBRL(totais.saldoBruto)}</div><div className="text-xs text-muted">atualizado pela taxa</div></div>
          <div className="rounded-md border bg-paper p-4"><div className="eyebrow">Saldo líquido</div><div className="num mt-1 text-lg font-semibold">{fmtBRL(totais.saldoLiquido)}</div><div className="text-xs text-muted">após IR ({fmtBRL(totais.irEstimado)})</div></div>
        </div>
        <div className="mt-2 text-sm text-muted">Taxa média ponderada da carteira: <b className="num text-ink">{fmtPct(taxaMediaPonderadaAnual)} a.a.</b></div>

        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted">
            <th className="py-2 font-medium">Empresa</th><th className="py-2 font-medium">Instrumento</th>
            <th className="py-2 text-right font-medium">Aportado</th><th className="py-2 text-right font-medium">Corrigido</th>
            <th className="py-2 text-right font-medium">Rendimento</th><th className="py-2 text-right font-medium">IR (aliq.)</th>
            <th className="py-2 text-right font-medium">Líquido</th>
          </tr></thead>
          <tbody>
            {posicoes.map((p) => (
              <tr key={p.aporteId} className="border-b">
                <td className="py-2">{p.empresa}</td><td className="py-2 text-muted">{p.instrumento}</td>
                <td className="num py-2 text-right">{fmtBRL(p.valorAportado)}</td>
                <td className="num py-2 text-right">{fmtBRL(p.saldoBruto)}</td>
                <td className="num py-2 text-right text-accent">{fmtBRL(p.rendimento)}</td>
                <td className="num py-2 text-right text-warn">{fmtBRL(p.irEstimado)} <span className="text-muted">({fmtPct(p.aliquotaIR, 1)})</span></td>
                <td className="num py-2 text-right font-semibold">{fmtBRL(p.saldoLiquido)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-[0.7rem] leading-relaxed text-muted">
          Documento gerado automaticamente para fins informativos. "Saldo corrigido" = capital atualizado pela curva de juros (CDI de referência acima); "saldo líquido" = após o IR estimado conforme o regime de cada instrumento (contratos de mútuo isentos). O percentual de IR considerado em cada aplicação está na coluna "IR%" (0% = isento, ex.: contratos de mútuo). Você pode conferir a correção pelo CDI/Selic na Calculadora do Cidadão do Banco Central.
        </p>
      </div>
    </div>
  );
}
