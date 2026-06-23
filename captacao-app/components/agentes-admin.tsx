"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink";
type Agente = { id: string; nome: string; documento: string | null; email: string | null; telefone: string | null; comissao_padrao: number; ativo: boolean };

export function AgentesAdmin({ agentes }: { agentes: Agente[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<Agente[]>(agentes);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [novo, setNovo] = useState(false);
  const vazio = { nome: "", documento: "", email: "", telefone: "", comissao_padrao: "", ativo: true };
  const [nf, setNf] = useState<any>(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function recarregar() {
    try { const r = await fetch("/api/agentes", { cache: "no-store" }); const j = await r.json(); if (j.ok) setLista(j.agentes); } catch {}
    window.location.reload();
  }
  function abrirEdicao(a: Agente) { setEditId(a.id); setForm({ ...a, comissao_padrao: a.comissao_padrao != null ? Number((a.comissao_padrao * 100).toFixed(6)) : "" }); setErro(null); setMsg(null); }
  async function salvar(id: string) {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/agentes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro || "Não foi possível salvar.");
    setEditId(null); setMsg("Alterações salvas ✓"); await recarregar();
  }
  async function criar() {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/agentes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nf) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro || "Não foi possível criar.");
    setNovo(false); setNf(vazio); setMsg("Agente criado ✓"); await recarregar();
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este agente?")) return;
    setErro(null); setMsg(null);
    const res = await fetch(`/api/agentes/${id}`, { method: "DELETE" });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setMsg("Agente excluído ✓"); await recarregar();
  }
  const pct = (v: number) => (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + "%";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>{msg && <span className="text-sm text-accent">{msg}</span>}{erro && <span className="text-sm text-neg">{erro}</span>}</div>
        {!novo && <button onClick={() => { setNovo(true); setMsg(null); }} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Novo agente</button>}
      </div>

      {novo && (
        <div className="mb-4 rounded-lg border bg-surface p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className="eyebrow">Nome</label><input className={input} value={nf.nome} onChange={(e) => setNf({ ...nf, nome: e.target.value })} /></div>
            <div><label className="eyebrow">CPF / CNPJ</label><input className={input} value={nf.documento} onChange={(e) => setNf({ ...nf, documento: e.target.value })} /></div>
            <div><label className="eyebrow">E-mail</label><input className={input} value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} /></div>
            <div><label className="eyebrow">Telefone</label><input className={input} value={nf.telefone} onChange={(e) => setNf({ ...nf, telefone: e.target.value })} /></div>
            <div><label className="eyebrow">Comissão padrão (%) — ex: 0,02 = 0,02%</label><input className={input} inputMode="decimal" value={nf.comissao_padrao} onChange={(e) => setNf({ ...nf, comissao_padrao: e.target.value })} placeholder="0,02" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={criar} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar agente</button>
            <button onClick={() => setNovo(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Nome</th><th className="px-5 py-2 font-medium">Documento</th>
            <th className="px-5 py-2 font-medium">E-mail</th><th className="px-5 py-2 text-right font-medium">Comissão padrão</th>
            <th className="px-5 py-2 font-medium">Ativo</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {lista.map((a) => editId === a.id ? (
              <tr key={a.id} className="border-t bg-paper/50">
                <td className="px-3 py-2"><input className={input} value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={input} value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={input} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={input} inputMode="decimal" value={form.comissao_padrao ?? ""} onChange={(e) => setForm({ ...form, comissao_padrao: e.target.value })} /></td>
                <td className="px-3 py-2"><input type="checkbox" checked={!!form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => salvar(a.id)} className="rounded-md bg-ink px-3 py-1 text-xs font-medium text-white">Salvar</button>
                  <button onClick={() => setEditId(null)} className="ml-1 rounded-md border px-3 py-1 text-xs">Cancelar</button>
                </td>
              </tr>
            ) : (
              <tr key={a.id} className="border-t">
                <td className="px-5 py-3 font-medium">{a.nome}</td>
                <td className="num px-5 py-3 text-muted">{a.documento || "—"}</td>
                <td className="px-5 py-3 text-muted">{a.email || "—"}</td>
                <td className="num px-5 py-3 text-right text-accent">{pct(a.comissao_padrao)}</td>
                <td className="px-5 py-3">{a.ativo ? "Sim" : "Não"}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => abrirEdicao(a)} className="rounded-md border px-3 py-1 text-xs">Editar</button>
                  <button onClick={() => excluir(a.id)} className="ml-1 rounded-md border border-neg px-3 py-1 text-xs text-neg hover:bg-neg hover:text-white">Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">Nenhum agente cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
