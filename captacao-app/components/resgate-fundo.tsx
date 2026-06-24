"use client";
import { useState, useMemo } from "react";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
const brl = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type PosCota = { aporteId: string; investidor: string; empresa: string; cotaSerie: string; quantidadeCotas: number; valorCotaHoje: number; valorAtual: number };

export function ResgateFundo({ posicoes }: { posicoes: PosCota[] }) {
  const [sel, setSel] = useState("");
  const [modo, setModo] = useState<"valor" | "quantidade">("valor");
  const [valor, setValor] = useState("");
  const [qtd, setQtd] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("efetuado");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const p = posicoes.find((x) => x.aporteId === sel);
  const vCota = p?.valorCotaHoje ?? 0;
  const qResg = useMemo(() => {
    if (!p) return 0;
    if (modo === "quantidade") return Number(String(qtd).replace(",", ".")) || 0;
    return vCota > 0 ? (Number(String(valor).replace(",", ".")) || 0) / vCota : 0;
  }, [p, modo, qtd, valor, vCota]);
  const vResg = qResg * vCota;

  async function salvar() {
    setErro(null); setOk(null); setSalvando(true);
    const res = await fetch("/api/resgates-fundo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aporte_id: sel, modo, valor, quantidade: qtd, valor_cota_dia: vCota, data_resgate: data, status }) });
    const j = await res.json(); setSalvando(false);
    if (!j.ok) return setErro(j.erro);
    setOk(`Resgate registrado: ${j.qtdResgatada.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} cotas · ${brl(j.valorBruto)}`);
    window.location.reload();
  }

  if (posicoes.length === 0) return <div className="rounded-lg border bg-surface p-6 text-center text-sm text-muted">Nenhum aporte de fundo ativo para resgatar.</div>;

  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="eyebrow">Aporte de fundo</label>
          <select className={input} value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Selecione…</option>
            {posicoes.map((x) => <option key={x.aporteId} value={x.aporteId}>{x.investidor} · {x.empresa} · {x.cotaSerie} ({x.quantidadeCotas.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} cotas)</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow">Lançamento</label>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}><option value="efetuado">Efetuado</option><option value="solicitado">Solicitação</option></select>
        </div>
        <div>
          <label className="eyebrow">Resgatar por</label>
          <select className={input} value={modo} onChange={(e) => setModo(e.target.value as any)}><option value="valor">Valor em R$</option><option value="quantidade">Quantidade de cotas</option></select>
        </div>
        {modo === "valor" ? (
          <div><label className="eyebrow">Valor a resgatar (R$)</label><input className={input} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
        ) : (
          <div><label className="eyebrow">Quantidade de cotas</label><input className={input} inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
        )}
        <div><label className="eyebrow">Data do resgate</label><input type="date" className={input} value={data} onChange={(e) => setData(e.target.value)} /></div>
      </div>

      {p && (
        <div className="mt-4 rounded-md border bg-paper p-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-muted">Valor da cota hoje <b className="num text-ink">{brl(vCota)}</b></span>
            <span className="text-muted">Posição atual <b className="num text-ink">{p.quantidadeCotas.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} cotas</b> ({brl(p.valorAtual)})</span>
          </div>
          {qResg > 0 && <div className="mt-2 flex flex-wrap gap-x-6"><span className="text-muted">Vai resgatar <b className="num text-accent">{qResg.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} cotas</b></span><span className="text-muted">Valor <b className="num text-accent">{brl(vResg)}</b></span></div>}
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-accent">{ok}</p>}
      <div className="mt-4"><button onClick={salvar} disabled={!sel || salvando} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Processando…" : "Registrar resgate de cotas"}</button></div>
    </div>
  );
}
