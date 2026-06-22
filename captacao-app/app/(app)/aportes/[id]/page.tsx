import { computeContaCorrente } from "@/lib/aporte";
import { Card, Stat } from "@/components/ui";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: { id: string } }) {
  const cc = await computeContaCorrente(params.id);
  if (!cc) notFound();
  return (
    <div className="p-8">
      <Link href="/aportes" className="text-sm text-muted hover:text-ink">← Aportes</Link>
      <div className="mt-2">
        <div className="eyebrow">Conta corrente do aporte</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{cc.investidor}</h1>
        <div className="text-sm text-muted">{cc.empresa} · {cc.instrumento}{cc.agente ? ` · agente: ${cc.agente}` : ""}</div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Saldo de caixa (entradas - saídas)" value={fmtBRL(cc.saldoCaixa)} />
        <Stat label="Saldo atualizado (com juros)" value={fmtBRL(cc.posicao?.saldoBruto ?? 0)} tone="accent" />
        <Stat label="Rendimento" value={fmtBRL(cc.posicao?.rendimento ?? 0)} tone="accent" />
        {cc.agente && <Stat label={`Comissão (${fmtPct(cc.comissaoPct)})`} value={fmtBRL(cc.comissaoValor)} tone="warn" />}
      </div>
      <Card className="mt-6">
        <div className="border-b px-5 py-3 eyebrow">Extrato — entradas e saídas</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Data</th><th className="px-5 py-2 font-medium">Descrição</th>
            <th className="px-5 py-2 text-right font-medium">Entrada</th><th className="px-5 py-2 text-right font-medium">Saída</th>
            <th className="px-5 py-2 text-right font-medium">Saldo</th>
          </tr></thead>
          <tbody>
            {cc.movimentos.map((m, i) => (
              <tr key={i} className="border-t">
                <td className="num px-5 py-3">{fmtData(m.data)}</td>
                <td className="px-5 py-3">{m.descricao}</td>
                <td className="num px-5 py-3 text-right text-accent">{m.entrada ? fmtBRL(m.entrada) : "—"}</td>
                <td className="num px-5 py-3 text-right text-neg">{m.saida ? fmtBRL(m.saida) : "—"}</td>
                <td className="num px-5 py-3 text-right font-semibold">{fmtBRL(m.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
