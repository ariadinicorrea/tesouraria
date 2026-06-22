"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
export function NovoAgente() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState({ nome: "", documento: "", email: "", telefone: "", comissao_padrao: "" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function salvar() {
    setErro(null);
    const res = await fetch("/api/agentes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro);
    setAberto(false); setF({ nome: "", documento: "", email: "", telefone: "", comissao_padrao: "" }); router.refresh();
  }
  if (!aberto) return <button onClick={() => setAberto(true)} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Novo agente</button>;
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><label className="eyebrow">Nome</label><input className={input} value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
        <div><label className="eyebrow">CPF / CNPJ</label><input className={input} value={f.documento} onChange={(e) => set("documento", e.target.value)} /></div>
        <div><label className="eyebrow">E-mail</label><input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div><label className="eyebrow">Telefone</label><input className={input} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
        <div><label className="eyebrow">Comissão padrão (fração: 0.02 = 2%)</label><input className={input} inputMode="decimal" value={f.comissao_padrao} onChange={(e) => set("comissao_padrao", e.target.value)} placeholder="0.02" /></div>
      </div>
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={salvar} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar agente</button>
        <button onClick={() => setAberto(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
      </div>
    </div>
  );
}
