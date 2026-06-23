"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";

const mesAtual = () => new Date().toISOString().slice(0, 7);
const compRotulo = (d: string) => { const x = new Date(d); return x.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); };

export function ComissoesFechamento({ comissoes, agentes }: { comissoes: any[]; agentes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<any[]>(comissoes);
  const [comp, setComp] = useState(mesAtual());
  const [fAgente, setFAgente] = useState("");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function recarregar() {
    const p = new URLSearchParams();
    if (fAgente) p.set("agente", fAgente);
    if (fDe) p.set("de", fDe + "-01");
    if (fAte) p.set("ate", fAte + "-31");
    try { const r = await fetch(`/api/comissoes?${p}`, { cache: "no-store" }); const j = await r.json(); if (j.ok) setLista(j.comissoes); } catch {}
    window.location.reload();
  }
  async function gerar() {
    setBusy(true); setErro(null); setMsg(null);
    const res = await fetch("/api/comissoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ competencia: comp }) });
    const j = await res.json(); setBusy(false);
    if (!j.ok) return setErro(j.erro);
    setMsg(`${j.geradas} comissão(ões) gerada(s) para ${compRotulo(comp + "-01")} (as já geradas não duplicam).`);
    await recarregar();
  }
  async function togglePago(c: any) {
    const novo = c.status === "pago" ? "pendente" : "pago";
    const res = await fetch(`/api/comissoes/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: novo }) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    await recarregar();
  }

  const totalPendente = lista.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
  const totalPago = lista.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div>
      {/* Gerar */}
      <div className="rounded-lg border bg-surface p-5 no-print">
        <div className="eyebrow">Fechamento mensal — gerar comissões</div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div><label className="eyebrow">Competência (mês)</label><br/><input type="month" value={comp} onChange={(e) => setComp(e.target.value)} className="rounded-md border bg-paper px-3 py-2 text-sm" /></div>
          <button onClick={gerar} disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Gerando…" : "Gerar comissões do mês"}</button>
        </div>
        <p className="mt-2 text-xs text-muted">Gera uma comissão para cada aporte captado no mês que tenha agente. Rodar de novo não duplica.</p>
        {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
        {erro && <p className="mt-2 text-sm text-neg">{erro}</p>}
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-end gap-3 no-print">
        <div><label className="eyebrow">Agente</label><br/>
          <select value={fAgente} onChange={(e) => setFAgente(e.target.value)} className="rounded-md border bg-surface px-3 py-2 text-sm"><option value="">Todos</option>{agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
        </div>
        <div><label className="eyebrow">De (mês)</label><br/><input type="month" value={fDe} onChange={(e) => setFDe(e.target.value)} className="rounded-md border bg-surface px-3 py-2 text-sm" /></div>
        <div><label className="eyebrow">Até (mês)</label><br/><input type="month" value={fAte} onChange={(e) => setFAte(e.target.value)} className="rounded-md border bg-surface px-3 py-2 text-sm" /></div>
        <button onClick={recarregar} className="rounded-md border px-4 py-2 text-sm hover:bg-paper">Filtrar</button>
        <button onClick={() => window.print()} className="rounded-md border px-4 py-2 text-sm hover:bg-paper">Imprimir</button>
      </div>

      {/* Resumo */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">A pagar (pendente)</div><div className="num mt-1 text-2xl font-semibold text-warn">{fmtBRL(totalPendente)}</div></div>
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">Já pago</div><div className="num mt-1 text-2xl font-semibold text-accent">{fmtBRL(totalPago)}</div></div>
        <div className="rounded-lg border bg-surface px-5 py-4"><div className="eyebrow">Total</div><div className="num mt-1 text-2xl font-semibold">{fmtBRL(totalPendente + totalPago)}</div></div>
      </div>

      {/* Tabela */}
      <div className="mt-6 rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Competência</th><th className="px-5 py-2 font-medium">Agente</th>
            <th className="px-5 py-2 font-medium">Investidor</th><th className="px-5 py-2 font-medium">Aporte</th>
            <th className="px-5 py-2 text-right font-medium">Base</th><th className="px-5 py-2 text-right font-medium">%</th>
            <th className="px-5 py-2 text-right font-medium">Comissão</th><th className="px-5 py-2 font-medium">Situação</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-5 py-3">{compRotulo(c.competencia)}</td>
                <td className="px-5 py-3 font-medium">{c.agentes?.nome ?? "—"}</td>
                <td className="px-5 py-3 text-muted">{c.aportes?.investidores?.nome_razao_social ?? "—"}</td>
                <td className="num px-5 py-3 text-muted">{c.aportes ? fmtData(c.aportes.data_aporte) : "—"}</td>
                <td className="num px-5 py-3 text-right">{fmtBRL(Number(c.base_valor))}</td>
                <td className="num px-5 py-3 text-right">{fmtPct(Number(c.percentual), 4)}</td>
                <td className="num px-5 py-3 text-right font-semibold">{fmtBRL(Number(c.valor))}</td>
                <td className="px-5 py-3">{c.status === "pago" ? <span className="text-accent">Pago{c.pago_em ? ` · ${fmtData(c.pago_em)}` : ""}</span> : <span className="text-warn">Pendente</span>}</td>
                <td className="px-5 py-3 text-right no-print">
                  <button onClick={() => togglePago(c)} className={`rounded-md border px-3 py-1 text-xs ${c.status === "pago" ? "" : "border-accent text-accent hover:bg-accent hover:text-white"}`}>
                    {c.status === "pago" ? "Marcar pendente" : "Marcar pago"}
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={9} className="px-5 py-6 text-center text-muted">Nenhuma comissão gerada. Use "Gerar comissões do mês".</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
