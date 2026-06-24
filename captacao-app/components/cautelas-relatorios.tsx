"use client";
import { useState } from "react";
import { Card } from "@/components/ui";
import { fmtBRL } from "@/lib/format";

type RelEstoque = { empresa: string; serie: string; dispQtd: number; dispValor: number; vendQtd: number; vendValor: number; totalQtd: number; totalValor: number };
type RelPorAporte = { empresa: string; investidor: string; aporteCodigo: string; dataAporte: string; qtd: number; valor: number; codigos: string };
type RelPorInvestidor = { investidor: string; empresa: string; qtd: number; valor: number };

function baixarCSV(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v ?? ""); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nome + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

const fmtData = (d: string) => d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
const th = "px-3 py-2 text-left font-medium text-muted";
const td = "px-3 py-2";
const tdR = "px-3 py-2 text-right num";
const btnCSV = "rounded-md border px-3 py-1.5 text-xs hover:bg-paper";

export function CautelasRelatorios({ estoque, porAporte, porInvestidor }: { estoque: RelEstoque[]; porAporte: RelPorAporte[]; porInvestidor: RelPorInvestidor[] }) {
  const [aba, setAba] = useState<"estoque" | "aporte" | "investidor">("estoque");
  const tab = (id: typeof aba, label: string) => (
    <button onClick={() => setAba(id)} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${aba === id ? "bg-ink text-white" : "text-ink/70 hover:bg-paper"}`}>{label}</button>
  );

  return (
    <Card>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tab("estoque", "Resumo do estoque")}
        {tab("aporte", "Cautelas por aporte")}
        {tab("investidor", "Cautelas por investidor")}
      </div>

      {aba === "estoque" && (
        <div className="mt-3">
          <div className="mb-2 flex justify-end">
            <button className={btnCSV} onClick={() => baixarCSV("estoque_cautelas",
              ["Empresa", "Série", "Disp. Qtd", "Disp. Valor", "Vend. Qtd", "Vend. Valor", "Total Qtd", "Total Valor"],
              estoque.map((r) => [r.empresa, r.serie, r.dispQtd, r.dispValor, r.vendQtd, r.vendValor, r.totalQtd, r.totalValor]))}>Exportar CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b"><tr><th className={th}>Empresa</th><th className={th}>Série</th><th className={th + " text-right"}>Disp. (qtd)</th><th className={th + " text-right"}>Disponível</th><th className={th + " text-right"}>Vend. (qtd)</th><th className={th + " text-right"}>Vendido</th><th className={th + " text-right"}>Total</th></tr></thead>
              <tbody>
                {estoque.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Sem cautelas cadastradas.</td></tr>}
                {estoque.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className={td}>{r.empresa}</td><td className={td}>{r.serie}</td>
                    <td className={tdR}>{r.dispQtd}</td><td className={tdR}>{fmtBRL(r.dispValor)}</td>
                    <td className={tdR}>{r.vendQtd}</td><td className={tdR}>{fmtBRL(r.vendValor)}</td>
                    <td className={tdR}>{fmtBRL(r.totalValor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === "aporte" && (
        <div className="mt-3">
          <div className="mb-2 flex justify-end">
            <button className={btnCSV} onClick={() => baixarCSV("cautelas_por_aporte",
              ["Investidor", "Empresa", "Aporte", "Data", "Qtd cautelas", "Valor", "Códigos"],
              porAporte.map((r) => [r.investidor, r.empresa, r.aporteCodigo, fmtData(r.dataAporte), r.qtd, r.valor, r.codigos]))}>Exportar CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b"><tr><th className={th}>Investidor</th><th className={th}>Empresa</th><th className={th}>Aporte</th><th className={th}>Data</th><th className={th + " text-right"}>Qtd</th><th className={th + " text-right"}>Valor</th><th className={th}>Códigos</th></tr></thead>
              <tbody>
                {porAporte.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Nenhuma cautela vendida ainda.</td></tr>}
                {porAporte.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className={td}>{r.investidor}</td><td className={td}>{r.empresa}</td><td className={td}>{r.aporteCodigo}</td><td className={td}>{fmtData(r.dataAporte)}</td>
                    <td className={tdR}>{r.qtd}</td><td className={tdR}>{fmtBRL(r.valor)}</td><td className={td + " text-xs"}>{r.codigos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === "investidor" && (
        <div className="mt-3">
          <div className="mb-2 flex justify-end">
            <button className={btnCSV} onClick={() => baixarCSV("cautelas_por_investidor",
              ["Investidor", "Empresa", "Qtd cautelas", "Valor total"],
              porInvestidor.map((r) => [r.investidor, r.empresa, r.qtd, r.valor]))}>Exportar CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b"><tr><th className={th}>Investidor</th><th className={th}>Empresa</th><th className={th + " text-right"}>Qtd cautelas</th><th className={th + " text-right"}>Valor total</th></tr></thead>
              <tbody>
                {porInvestidor.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">Nenhuma cautela vendida ainda.</td></tr>}
                {porInvestidor.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className={td}>{r.investidor}</td><td className={td}>{r.empresa}</td>
                    <td className={tdR}>{r.qtd}</td><td className={tdR}>{fmtBRL(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
