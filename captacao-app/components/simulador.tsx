"use client";
import { useState, useMemo } from "react";
import { taxaEfetivaAnual, taxaMediaPonderada, custoCaptacaoCarteira, projetarCusto } from "@/lib/funding-engine";

const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
const brl = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (f: number, c = 2) => `${((f ?? 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c })}%`;

type Pos = { saldoBruto: number; taxaEfetivaAnual: number };

export function Simulador({ posicoes, cdi }: { posicoes: Pos[]; cdi: number }) {
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("percentual_cdi");
  const [taxaValor, setTaxaValor] = useState("");
  const [periodo, setPeriodo] = useState("anual");
  const [percentualCdi, setPercentualCdi] = useState("");

  const base = useMemo(() => {
    const tm = taxaMediaPonderada(posicoes);
    const custo = custoCaptacaoCarteira(posicoes);
    const proj = projetarCusto(posicoes, [], [182, 365, 730]);
    return { tm, custo, proj };
  }, [posicoes]);

  const sim = useMemo(() => {
    const v = Number(valor);
    if (!v || v <= 0) return null;
    const params = tipo === "percentual_cdi"
      ? { tipo: "percentual_cdi" as const, percentualCdi: Number(percentualCdi) || 1 }
      : { tipo: tipo as "fixa" | "cdi_mais", taxaValor: Number(taxaValor) || 0, periodo: periodo as "anual" | "mensal" };
    const taxaEf = taxaEfetivaAnual(params, cdi);
    const novas = [...posicoes, { saldoBruto: v, taxaEfetivaAnual: taxaEf }];
    return { tm: taxaMediaPonderada(novas), custo: custoCaptacaoCarteira(novas), taxaEf };
  }, [valor, tipo, taxaValor, periodo, percentualCdi, posicoes, cdi]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-surface p-5">
        <div className="eyebrow">Carteira atual (CDI {pct(cdi)})</div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div><div className="eyebrow">Saldo total</div><div className="num mt-1 text-lg font-semibold">{brl(base.tm.saldoTotal)}</div></div>
          <div><div className="eyebrow">Taxa média</div><div className="num mt-1 text-lg font-semibold text-accent">{pct(base.tm.anual)}</div></div>
          <div><div className="eyebrow">Custo mensal</div><div className="num mt-1 text-lg font-semibold text-warn">{brl(base.custo.mensal)}</div></div>
          <div><div className="eyebrow">Custo anual</div><div className="num mt-1 text-lg font-semibold text-warn">{brl(base.custo.anual)}</div></div>
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-5">
        <div className="border-b px-0 pb-2 eyebrow">Projeção de custo (mantendo a carteira)</div>
        <p className="mt-2 text-xs text-muted">Projeção estimada considerando o CDI atual constante. Valores reais variam conforme o CDI mudar.</p>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="py-2 font-medium">Horizonte</th>
            <th className="py-2 text-right font-medium">Saldo projetado</th>
            <th className="py-2 text-right font-medium">Custo acumulado</th>
          </tr></thead>
          <tbody>
            {base.proj.map((p) => (
              <tr key={p.horizonteDias} className="border-t">
                <td className="py-2">{p.horizonteDias === 182 ? "6 meses" : p.horizonteDias === 365 ? "1 ano" : p.horizonteDias === 730 ? "2 anos" : p.horizonteDias + " dias"}</td>
                <td className="num py-2 text-right">{brl(p.saldoProjetado)}</td>
                <td className="num py-2 text-right text-warn">{brl(p.custoAcumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-surface p-5">
        <div className="eyebrow">Simular novo aporte</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div><label className="eyebrow">Valor (R$)</label><input className={input} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><label className="eyebrow">Modalidade</label>
            <select className={input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="percentual_cdi">% do CDI</option>
              <option value="cdi_mais">CDI + spread</option>
              <option value="fixa">Taxa fixa</option>
            </select>
          </div>
          {tipo === "percentual_cdi" ? (
            <div><label className="eyebrow">% do CDI (1.10=110%)</label><input className={input} inputMode="decimal" value={percentualCdi} onChange={(e) => setPercentualCdi(e.target.value)} placeholder="1.10" /></div>
          ) : (
            <>
              <div><label className="eyebrow">Taxa/spread (fração)</label><input className={input} inputMode="decimal" value={taxaValor} onChange={(e) => setTaxaValor(e.target.value)} placeholder="0.02" /></div>
              <div><label className="eyebrow">Período</label><select className={input} value={periodo} onChange={(e) => setPeriodo(e.target.value)}><option value="anual">Anual</option><option value="mensal">Mensal</option></select></div>
            </>
          )}
        </div>

        {sim && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div><div className="eyebrow">Nova taxa média</div><div className="num mt-1 text-lg font-semibold text-accent">{pct(sim.tm.anual)}</div><div className="text-xs text-muted">era {pct(base.tm.anual)}</div></div>
            <div><div className="eyebrow">Taxa do novo aporte</div><div className="num mt-1 text-lg font-semibold">{pct(sim.taxaEf)}</div></div>
            <div><div className="eyebrow">Novo custo mensal</div><div className="num mt-1 text-lg font-semibold text-warn">{brl(sim.custo.mensal)}</div></div>
            <div><div className="eyebrow">Novo custo anual</div><div className="num mt-1 text-lg font-semibold text-warn">{brl(sim.custo.anual)}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
