"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink";
const TIPOS = [{ v: "fidc", l: "FIDC (cotas)" }, { v: "securitizadora", l: "Securitizadora" }, { v: "contratos", l: "Contratos (mútuo)" }];
const REGIMES = [{ v: "fixo_15", l: "Fixo 15%" }, { v: "regressivo", l: "Regressivo" }, { v: "isento", l: "Isento" }];
type Empresa = { id: string; nome: string; tipo: string; cnpj: string | null; regime_tributario: string; ativo: boolean };

export function EmpresasAdmin({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<Empresa[]>(empresas);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState({ nome: "", tipo: "fidc", cnpj: "", regime_tributario: "fixo_15", ativo: true });
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function recarregar() {
    try { const r = await fetch("/api/empresas", { cache: "no-store" }); const j = await r.json(); if (j.ok) setLista(j.empresas); } catch {}
    window.location.reload();
  }
  function abrirEdicao(e: Empresa) { setEditId(e.id); setForm({ ...e }); setErro(null); setMsg(null); }

  async function salvar(id: string) {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/empresas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro || "Não foi possível salvar.");
    setEditId(null); setMsg("Alterações salvas ✓"); await recarregar();
  }
  async function criar() {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/empresas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nf) });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro || "Não foi possível criar.");
    setNovo(false); setNf({ nome: "", tipo: "fidc", cnpj: "", regime_tributario: "fixo_15", ativo: true }); setMsg("Empresa criada ✓"); await recarregar();
  }
  async function excluir(id: string) {
    if (!confirm("Excluir esta empresa?")) return;
    setErro(null); setMsg(null);
    const res = await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro);
    setMsg("Empresa excluída ✓"); await recarregar();
  }
  const rotulo = (arr: any[], v: string) => arr.find((x) => x.v === v)?.l ?? v;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>{msg && <span className="text-sm text-accent">{msg}</span>}{erro && <span className="text-sm text-neg">{erro}</span>}</div>
        {!novo && <button onClick={() => { setNovo(true); setMsg(null); }} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Nova empresa</button>}
      </div>

      {novo && (
        <div className="mb-4 rounded-lg border bg-surface p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className="eyebrow">Nome</label><input className={input} value={nf.nome} onChange={(e) => setNf({ ...nf, nome: e.target.value })} /></div>
            <div><label className="eyebrow">CNPJ</label><input className={input} value={nf.cnpj} onChange={(e) => setNf({ ...nf, cnpj: e.target.value })} /></div>
            <div><label className="eyebrow">Tipo</label><select className={input} value={nf.tipo} onChange={(e) => setNf({ ...nf, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
            <div><label className="eyebrow">Regime tributário</label><select className={input} value={nf.regime_tributario} onChange={(e) => setNf({ ...nf, regime_tributario: e.target.value })}>{REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={criar} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar empresa</button>
            <button onClick={() => setNovo(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Nome</th><th className="px-5 py-2 font-medium">Tipo</th>
            <th className="px-5 py-2 font-medium">CNPJ</th><th className="px-5 py-2 font-medium">Regime IR</th>
            <th className="px-5 py-2 font-medium">Ativa</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {lista.map((e) => editId === e.id ? (
              <tr key={e.id} className="border-t bg-paper/50">
                <td className="px-3 py-2"><input className={input} value={form.nome ?? ""} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} /></td>
                <td className="px-3 py-2"><select className={input} value={form.tipo} onChange={(ev) => setForm({ ...form, tipo: ev.target.value })}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></td>
                <td className="px-3 py-2"><input className={input} value={form.cnpj ?? ""} onChange={(ev) => setForm({ ...form, cnpj: ev.target.value })} /></td>
                <td className="px-3 py-2"><select className={input} value={form.regime_tributario} onChange={(ev) => setForm({ ...form, regime_tributario: ev.target.value })}>{REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></td>
                <td className="px-3 py-2"><input type="checkbox" checked={!!form.ativo} onChange={(ev) => setForm({ ...form, ativo: ev.target.checked })} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => salvar(e.id)} className="rounded-md bg-ink px-3 py-1 text-xs font-medium text-white">Salvar</button>
                  <button onClick={() => setEditId(null)} className="ml-1 rounded-md border px-3 py-1 text-xs">Cancelar</button>
                </td>
              </tr>
            ) : (
              <tr key={e.id} className="border-t">
                <td className="px-5 py-3 font-medium">{e.nome}</td>
                <td className="px-5 py-3 text-muted">{rotulo(TIPOS, e.tipo)}</td>
                <td className="num px-5 py-3 text-muted">{e.cnpj || "—"}</td>
                <td className="px-5 py-3 text-muted">{rotulo(REGIMES, e.regime_tributario)}</td>
                <td className="px-5 py-3">{e.ativo ? "Sim" : "Não"}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => abrirEdicao(e)} className="rounded-md border px-3 py-1 text-xs">Editar</button>
                  <button onClick={() => excluir(e.id)} className="ml-1 rounded-md border border-neg px-3 py-1 text-xs text-neg hover:bg-neg hover:text-white">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Atenção: mudar o <b>tipo</b> ou o <b>regime tributário</b> altera como rendimentos e IR são calculados. Mude com cuidado.</p>
    </div>
  );
}
