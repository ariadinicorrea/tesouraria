"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtBRL, fmtData } from "@/lib/format";
const input = "w-full rounded-md border bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink";
const qtd = (n: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

export function CautelasAdmin({ cautelas, empresas }: { cautelas: any[]; empresas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<any[]>(cautelas);
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState<any>({ empresa_id: "", serie: "", quantidade_emitida: "", valor_unitario: "", vencimento: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function recarregar() {
    try { const r = await fetch("/api/cautelas", { cache: "no-store" }); const j = await r.json(); if (j.ok) setLista(j.cautelas); } catch {}
    window.location.reload();
  }
  async function criar() {
    setErro(null); setMsg(null);
    const res = await fetch("/api/cautelas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nf) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setNovo(false); setNf({ empresa_id: "", serie: "", quantidade_emitida: "", valor_unitario: "", vencimento: "" }); setMsg("Emissão cadastrada ✓"); await recarregar();
  }
  async function salvar(id: string) {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/cautelas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setEditId(null); setMsg("Alterações salvas ✓"); await recarregar();
  }
  async function excluir(id: string) {
    if (!confirm("Excluir esta emissão?")) return;
    const res = await fetch(`/api/cautelas/${id}`, { method: "DELETE" });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setMsg("Emissão excluída ✓"); await recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>{msg && <span className="text-sm text-accent">{msg}</span>}{erro && <span className="text-sm text-neg">{erro}</span>}</div>
        {!novo && <button onClick={() => { setNovo(true); setMsg(null); }} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Nova emissão</button>}
      </div>

      {novo && (
        <div className="mb-4 rounded-lg border bg-surface p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div><label className="eyebrow">Empresa</label><select className={input} value={nf.empresa_id} onChange={(e) => setNf({ ...nf, empresa_id: e.target.value })}><option value="">Selecione…</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
            <div><label className="eyebrow">Série / identificação</label><input className={input} value={nf.serie} onChange={(e) => setNf({ ...nf, serie: e.target.value })} placeholder="Ex: 1ª série" /></div>
            <div><label className="eyebrow">Quantidade emitida</label><input className={input} inputMode="decimal" value={nf.quantidade_emitida} onChange={(e) => setNf({ ...nf, quantidade_emitida: e.target.value })} /></div>
            <div><label className="eyebrow">Valor unitário (R$)</label><input className={input} inputMode="decimal" value={nf.valor_unitario} onChange={(e) => setNf({ ...nf, valor_unitario: e.target.value })} /></div>
            <div><label className="eyebrow">Vencimento</label><input type="date" className={input} value={nf.vencimento} onChange={(e) => setNf({ ...nf, vencimento: e.target.value })} /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={criar} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar emissão</button>
            <button onClick={() => setNovo(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Empresa</th><th className="px-5 py-2 font-medium">Série</th>
            <th className="px-5 py-2 text-right font-medium">Emitida</th><th className="px-5 py-2 text-right font-medium">Vendida</th>
            <th className="px-5 py-2 text-right font-medium">Disponível</th><th className="px-5 py-2 text-right font-medium">Vlr unit.</th>
            <th className="px-5 py-2 font-medium">Vencimento</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {lista.map((c) => editId === c.id ? (
              <tr key={c.id} className="border-t bg-paper/50">
                <td className="px-3 py-2 text-muted">{c.empresa}</td>
                <td className="px-3 py-2"><input className={input} value={form.serie ?? ""} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={input} inputMode="decimal" value={form.quantidade_emitida ?? ""} onChange={(e) => setForm({ ...form, quantidade_emitida: e.target.value })} /></td>
                <td className="num px-3 py-2 text-right text-muted">{qtd(c.vendida)}</td>
                <td className="num px-3 py-2 text-right text-muted">{qtd(c.disponivel)}</td>
                <td className="px-3 py-2"><input className={input} inputMode="decimal" value={form.valor_unitario ?? ""} onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })} /></td>
                <td className="px-3 py-2"><input type="date" className={input} value={form.vencimento ?? ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap"><button onClick={() => salvar(c.id)} className="rounded-md bg-ink px-3 py-1 text-xs font-medium text-white">Salvar</button><button onClick={() => setEditId(null)} className="ml-1 rounded-md border px-3 py-1 text-xs">Cancelar</button></td>
              </tr>
            ) : (
              <tr key={c.id} className={`border-t ${c.disponivel < 0 ? "bg-neg/5" : ""}`}>
                <td className="px-5 py-3 font-medium">{c.empresa}</td>
                <td className="px-5 py-3 text-muted">{c.serie}</td>
                <td className="num px-5 py-3 text-right">{qtd(c.quantidadeEmitida)}</td>
                <td className="num px-5 py-3 text-right">{qtd(c.vendida)}</td>
                <td className={`num px-5 py-3 text-right font-semibold ${c.disponivel < 0 ? "text-neg" : "text-accent"}`}>{qtd(c.disponivel)}</td>
                <td className="num px-5 py-3 text-right text-muted">{fmtBRL(c.valorUnitario)}</td>
                <td className="px-5 py-3 text-muted">{c.vencimento ? fmtData(c.vencimento) : "—"}{c.diasParaVencer != null && c.diasParaVencer <= 30 && <span className="ml-1 text-warn">({c.diasParaVencer}d)</span>}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditId(c.id); setForm({ serie: c.serie, quantidade_emitida: c.quantidadeEmitida, valor_unitario: c.valorUnitario, vencimento: c.vencimento ?? "", ativo: true }); setMsg(null); }} className="rounded-md border px-3 py-1 text-xs">Editar</button>
                  <button onClick={() => excluir(c.id)} className="ml-1 rounded-md border border-neg px-3 py-1 text-xs text-neg hover:bg-neg hover:text-white">Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={8} className="px-5 py-6 text-center text-muted">Nenhuma emissão cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">"Vendida" e "Disponível" são calculadas a partir dos aportes ligados a cada emissão. Quando um aporte é resgatado totalmente, a quantidade volta para "Disponível". Vincule o aporte a uma emissão na tela de Aportes.</p>
    </div>
  );
}
