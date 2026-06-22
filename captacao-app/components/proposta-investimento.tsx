"use client";
import { useState } from "react";
import { taxaEfetivaAnual, saldoBrutoAtualizado, calcularTributacao, iofAliquota } from "@/lib/funding-engine";
import { fmtBRL, fmtPct } from "@/lib/format";

const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
const num = (s: string) => Number(String(s ?? "").replace(/\s/g, "").replace(",", ".")) || 0;

export function PropostaInvestimento({ cdiAtual, logo }: { cdiAtual: number; logo: string | null }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("100000");
  const [modalidade, setModalidade] = useState("percentual_cdi");
  const [percentualCdi, setPercentualCdi] = useState("110");
  const [spread, setSpread] = useState("2");
  const [taxaFixa, setTaxaFixa] = useState("14");
  const [regime, setRegime] = useState("fixo_15");
  const [prazo, setPrazo] = useState("12");

  const params =
    modalidade === "percentual_cdi" ? { tipo: "percentual_cdi" as const, percentualCdi: num(percentualCdi) / 100 }
    : modalidade === "cdi_mais" ? { tipo: "cdi_mais" as const, taxaValor: num(spread) / 100, periodo: "anual" as const }
    : { tipo: "fixa" as const, taxaValor: num(taxaFixa) / 100, periodo: "anual" as const };

  const taxaEf = taxaEfetivaAnual(params, cdiAtual);
  const P = num(valor);
  const prazoMeses = Math.max(1, Math.round(num(prazo)));
  const horizontes = Array.from(new Set([6, 12, 24, 36, prazoMeses])).sort((a, b) => a - b);

  const linha = (meses: number) => {
    const diasUteis = Math.round(meses * 21);
    const diasCorridos = Math.round(meses * 30);
    const bruto = saldoBrutoAtualizado(P, taxaEf, diasUteis);
    const rend = bruto - P;
    const iof = regime !== "isento" && diasCorridos < 30 ? rend * iofAliquota(diasCorridos) : 0;
    const baseIr = Math.max(rend - iof, 0);
    const trib = calcularTributacao(regime as any, baseIr, diasCorridos);
    const liquido = P + rend - iof - trib.irRetido;
    const poupMensal = cdiAtual > 0.085 ? 0.005 : 0.70 * (Math.pow(1 + cdiAtual, 1 / 12) - 1);
    const poupFinal = P * Math.pow(1 + poupMensal, meses);
    const vantagem = liquido - poupFinal;
    return { meses, bruto, rend, ir: trib.irRetido, aliq: trib.aliquota, iof, liquido, poupFinal, vantagem };
  };
  const rotuloMes = (m: number) => m === 6 ? "Até 6 meses" : m === 12 ? "De 6 meses a 1 ano" : m === 24 ? "De 1 a 2 anos" : m === 36 ? "De 2 anos em diante" : `${m} meses`;
  const modLabel = modalidade === "percentual_cdi" ? `${num(percentualCdi)}% do CDI` : modalidade === "cdi_mais" ? `CDI + ${num(spread)}% a.a.` : `${num(taxaFixa)}% a.a. (fixa)`;
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div>
      {/* Formulário */}
      <div className="rounded-lg border bg-surface p-5 no-print">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div><label className="eyebrow">Nome do investidor (opcional)</label><input className={input} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><label className="eyebrow">Valor a investir (R$)</label><input className={input} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><label className="eyebrow">Prazo (meses)</label><input className={input} inputMode="numeric" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
          <div><label className="eyebrow">Remuneração</label><select className={input} value={modalidade} onChange={(e) => setModalidade(e.target.value)}><option value="percentual_cdi">% do CDI</option><option value="cdi_mais">CDI + spread</option><option value="fixa">Taxa fixa</option></select></div>
          {modalidade === "percentual_cdi" && <div><label className="eyebrow">% do CDI (ex: 110)</label><input className={input} inputMode="decimal" value={percentualCdi} onChange={(e) => setPercentualCdi(e.target.value)} /></div>}
          {modalidade === "cdi_mais" && <div><label className="eyebrow">Spread (% a.a.)</label><input className={input} inputMode="decimal" value={spread} onChange={(e) => setSpread(e.target.value)} /></div>}
          {modalidade === "fixa" && <div><label className="eyebrow">Taxa fixa (% a.a.)</label><input className={input} inputMode="decimal" value={taxaFixa} onChange={(e) => setTaxaFixa(e.target.value)} /></div>}
          <div><label className="eyebrow">Tributação</label><select className={input} value={regime} onChange={(e) => setRegime(e.target.value)}><option value="fixo_15">Fundo (15%)</option><option value="regressivo">Regressiva (22,5% a 15%)</option><option value="isento">Isento (mútuo)</option></select></div>
        </div>
        <div className="mt-3 flex justify-end"><button onClick={() => window.print()} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Imprimir / Salvar PDF</button></div>
      </div>

      {/* Proposta (imprimível) */}
      <div className="mt-6 rounded-lg border bg-surface p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
            <div><div className="text-lg font-semibold tracking-tight">Proposta de Investimento</div><div className="text-sm text-muted">Emitida em {hoje}</div></div>
          </div>
          <div className="text-right text-xs text-muted">CDI de referência<div className="num text-sm font-semibold text-ink">{fmtPct(cdiAtual)} a.a.</div></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {nome && <div><span className="text-muted">Investidor:</span> <b>{nome}</b></div>}
          <div><span className="text-muted">Valor:</span> <b className="num">{fmtBRL(P)}</b></div>
          <div><span className="text-muted">Remuneração:</span> <b>{modLabel}</b></div>
          <div><span className="text-muted">Taxa efetiva:</span> <b className="num">{fmtPct(taxaEf)} a.a.</b></div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted">
            <th className="py-2 font-medium">Prazo</th><th className="py-2 text-right font-medium">Valor bruto</th>
            <th className="py-2 text-right font-medium">Rendimento</th><th className="py-2 text-right font-medium">IR (aliq.)</th>
            <th className="py-2 text-right font-medium">Valor líquido</th>
          </tr></thead>
          <tbody>
            {horizontes.map((m) => { const l = linha(m); return (
              <tr key={m} className={`border-b ${m === prazoMeses ? "font-semibold" : ""}`}>
                <td className="py-2">{rotuloMes(m)}{m === prazoMeses ? " (seu prazo)" : ""}</td>
                <td className="num py-2 text-right">{fmtBRL(l.bruto)}</td>
                <td className="num py-2 text-right text-accent">{fmtBRL(l.rend)}</td>
                <td className="num py-2 text-right text-warn">{fmtBRL(l.ir)} <span className="text-muted">({fmtPct(l.aliq, 1)})</span></td>
                <td className="num py-2 text-right">{fmtBRL(l.liquido)}</td>
              </tr>
            ); })}
          </tbody>
        </table>

        <div className="mt-7 eyebrow">Comparativo com a poupança</div>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted">
            <th className="py-2 font-medium">Prazo</th><th className="py-2 text-right font-medium">Seu investimento (líquido)</th>
            <th className="py-2 text-right font-medium">Poupança</th><th className="py-2 text-right font-medium">Vantagem</th>
          </tr></thead>
          <tbody>
            {horizontes.map((m) => { const l = linha(m); return (
              <tr key={m} className={`border-b ${m === prazoMeses ? "font-semibold" : ""}`}>
                <td className="py-2">{rotuloMes(m)}{m === prazoMeses ? " (seu prazo)" : ""}</td>
                <td className="num py-2 text-right text-accent">{fmtBRL(l.liquido)}</td>
                <td className="num py-2 text-right text-muted">{fmtBRL(l.poupFinal)}</td>
                <td className={`num py-2 text-right font-semibold ${l.vantagem >= 0 ? "text-accent" : "text-neg"}`}>{l.vantagem >= 0 ? "+" : ""}{fmtBRL(l.vantagem)}</td>
              </tr>
            ); })}
          </tbody>
        </table>

        <p className="mt-6 text-[0.7rem] leading-relaxed text-muted">
          Projeção estimada considerando o <b>CDI atual de {fmtPct(cdiAtual)} a.a.</b>, mantido constante — os valores reais variam conforme o CDI ao longo do tempo. O IR segue o regime indicado (no regime regressivo, a alíquota cai de 22,5% para 15% conforme o prazo). A <b>poupança</b> é isenta de IR e foi calculada pela regra vigente (0,5% ao mês enquanto a Selic está acima de 8,5% a.a.), por isso o comparativo usa o valor <b>líquido</b> dos dois lados. Documento informativo, não constitui garantia de rentabilidade.
        </p>
      </div>
    </div>
  );
}
