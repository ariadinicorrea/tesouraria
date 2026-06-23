"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
const brl = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Aporte = { aporteId: string; empresa: string; investidor: string; valorAportado: number; saldoBruto: number; rendimento: number; dataAporte: string };

export function NovoResgate({ aportes }: { aportes: Aporte[] }) {
  const router = useRouter();
  const [sel, setSel] = useState("");
  const [tipo, setTipo] = useState("total");
  const [principal, setPrincipal] = useState("");
  const [juros, setJuros] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("efetuado");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const a = aportes.find((x) => x.aporteId === sel);

  async function salvar() {
    setErro(null); setOk(null); setSalvando(true);
    const res = await fetch("/api/resgates", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aporte_id: sel, tipo_resgate: tipo, valor_principal: principal, valor_juros: juros, data_resgate: data, status }) });
    const j = await res.json(); setSalvando(false);
    if (!j.ok) return setErro(j.erro);
    setOk(`Resgate registrado. Bruto ${brl(j.valorBruto)} · IR ${brl(j.irRetido)} (${(j.aliquota * 100).toFixed(1)}%) · Líquido ${brl(j.valorLiquido)}`);
    setSel(""); setPrincipal(""); setJuros(""); window.location.reload();
  }

  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="eyebrow">De qual aporte resgatar</label>
          <select className={input} value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Selecione um aporte…</option>
            {aportes.map((x) => (<option key={x.aporteId} value={x.aporteId}>{x.investidor} · {x.empresa} · aporte {brl(x.valorAportado)} ({x.dataAporte.slice(0,10).split("-").reverse().join("/")})</option>))}
          </select>
        </div>
        <div>
          <label className="eyebrow">Tipo de resgate</label>
          <select className={input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="total">Total (encerra a posição)</option>
            <option value="parcial">Parcial (escolher principal e juros)</option>
            <option value="apenas_juros">Apenas os juros (mantém o principal)</option>
          </select>
        </div>
        <div>
          <label className="eyebrow">Lançamento</label>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="efetuado">Efetuado (já pago)</option>
            <option value="solicitado">Solicitação (pendente)</option>
          </select>
        </div>
        {tipo === "parcial" && (<>
          <div><label className="eyebrow">Valor do principal a resgatar (R$)</label><input className={input} inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0,00" /></div>
          <div><label className="eyebrow">Valor dos juros a resgatar (R$)</label><input className={input} inputMode="decimal" value={juros} onChange={(e) => setJuros(e.target.value)} placeholder="0,00" /></div>
        </>)}
        <div><label className="eyebrow">Data do resgate</label><input type="date" className={input} value={data} onChange={(e) => setData(e.target.value)} /></div>
      </div>

      {a && (
        <div className="mt-4 rounded-md border bg-paper p-3 text-sm">
          <div className="eyebrow">Posição atual do aporte selecionado</div>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-muted">Saldo bruto <b className="num text-ink">{brl(a.saldoBruto)}</b></span>
            <span className="text-muted">Rendimento (juros disponível) <b className="num text-accent">{brl(a.rendimento)}</b></span>
            <span className="text-muted">Principal aportado <b className="num text-ink">{brl(a.valorAportado)}</b></span>
          </div>
          <p className="mt-2 text-xs text-muted">No resgate parcial, o IR incide somente sobre a parcela de juros.</p>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-accent">{ok}</p>}
      <div className="mt-4"><button onClick={salvar} disabled={!sel || salvando} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Processando…" : "Registrar resgate"}</button></div>
    </div>
  );
}
