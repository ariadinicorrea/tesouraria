"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
export function NovoInvestidor() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const vazio = { nome_razao_social: "", documento: "", tipo_pessoa: "PF", email: "", telefone: "", data_ingresso: "", data_nascimento: "", banco: "", agencia: "", conta: "", chave_pix: "" };
  const [form, setForm] = useState(vazio);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  async function salvar() {
    setSalvando(true); setErro(null);
    const res = await fetch("/api/investidores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json(); setSalvando(false);
    if (!json.ok) return setErro(json.erro);
    setAberto(false); setForm(vazio); window.location.reload();
  }
  if (!aberto) return <button onClick={() => setAberto(true)} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90">Novo investidor</button>;
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><label className="eyebrow">Nome / Razão social</label><input className={input} value={form.nome_razao_social} onChange={(e) => set("nome_razao_social", e.target.value)} /></div>
        <div><label className="eyebrow">CPF / CNPJ</label><input className={input} value={form.documento} onChange={(e) => set("documento", e.target.value)} /></div>
        <div><label className="eyebrow">Tipo de pessoa</label><select className={input} value={form.tipo_pessoa} onChange={(e) => set("tipo_pessoa", e.target.value)}><option value="PF">Pessoa Física</option><option value="PJ">Pessoa Jurídica</option></select></div>
        <div><label className="eyebrow">Data de nascimento</label><input type="date" className={input} value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} /></div>
        <div><label className="eyebrow">Data de ingresso</label><input type="date" className={input} value={form.data_ingresso} onChange={(e) => set("data_ingresso", e.target.value)} /></div>
        <div><label className="eyebrow">E-mail</label><input className={input} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div><label className="eyebrow">Telefone</label><input className={input} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
        <div><label className="eyebrow">Banco</label><input className={input} value={form.banco} onChange={(e) => set("banco", e.target.value)} /></div>
        <div><label className="eyebrow">Agência</label><input className={input} value={form.agencia} onChange={(e) => set("agencia", e.target.value)} /></div>
        <div><label className="eyebrow">Conta</label><input className={input} value={form.conta} onChange={(e) => set("conta", e.target.value)} /></div>
        <div><label className="eyebrow">Chave PIX</label><input className={input} value={form.chave_pix} onChange={(e) => set("chave_pix", e.target.value)} /></div>
      </div>
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={salvar} disabled={salvando} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Salvando…" : "Salvar investidor"}</button>
        <button onClick={() => setAberto(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
      </div>
    </div>
  );
}
