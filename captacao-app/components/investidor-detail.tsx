"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
export function InvestidorDetail({ investidor }: { investidor: any }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState({
    nome_razao_social: investidor.nome_razao_social ?? "", documento: investidor.documento ?? "",
    tipo_pessoa: investidor.tipo_pessoa ?? "PF", email: investidor.email ?? "", telefone: investidor.telefone ?? "",
    data_ingresso: investidor.data_ingresso ?? "", data_nascimento: investidor.data_nascimento ?? "",
    banco: investidor.banco ?? "", agencia: investidor.agencia ?? "", conta: investidor.conta ?? "", chave_pix: investidor.chave_pix ?? "",
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function salvar() {
    setErro(null); setMsg(null);
    const res = await fetch(`/api/investidores/${investidor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro);
    setEditando(false); setMsg("Dados atualizados."); router.refresh();
  }
  async function excluir() {
    if (!confirm("Excluir este investidor? Esta ação não pode ser desfeita.")) return;
    setErro(null);
    const res = await fetch(`/api/investidores/${investidor.id}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.ok) return setErro(j.erro);
    router.push("/investidores"); router.refresh();
  }
  return (
    <div className="mt-6 rounded-lg border bg-surface p-5 no-print">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Cadastro</div>
        {!editando && (<div className="flex gap-2">
          <button onClick={() => setEditando(true)} className="rounded-md border px-3 py-1.5 text-sm">Editar</button>
          <button onClick={excluir} className="rounded-md border border-neg px-3 py-1.5 text-sm text-neg hover:bg-neg hover:text-white">Excluir</button>
        </div>)}
      </div>
      {!editando ? (
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <div><span className="text-muted">E-mail:</span> {investidor.email || "—"}</div>
          <div><span className="text-muted">Telefone:</span> {investidor.telefone || "—"}</div>
          <div><span className="text-muted">Banco:</span> {investidor.banco || "—"} {investidor.agencia ? `· Ag. ${investidor.agencia}` : ""} {investidor.conta ? `· C/C ${investidor.conta}` : ""}</div>
          <div><span className="text-muted">PIX:</span> {investidor.chave_pix || "—"}</div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className="eyebrow">Nome / Razão social</label><input className={input} value={f.nome_razao_social} onChange={(e) => set("nome_razao_social", e.target.value)} /></div>
            <div><label className="eyebrow">CPF / CNPJ</label><input className={input} value={f.documento} onChange={(e) => set("documento", e.target.value)} /></div>
            <div><label className="eyebrow">Tipo</label><select className={input} value={f.tipo_pessoa} onChange={(e) => set("tipo_pessoa", e.target.value)}><option value="PF">Pessoa Física</option><option value="PJ">Pessoa Jurídica</option></select></div>
            <div><label className="eyebrow">Data de nascimento</label><input type="date" className={input} value={f.data_nascimento ?? ""} onChange={(e) => set("data_nascimento", e.target.value)} /></div>
            <div><label className="eyebrow">Data de ingresso</label><input type="date" className={input} value={f.data_ingresso ?? ""} onChange={(e) => set("data_ingresso", e.target.value)} /></div>
            <div><label className="eyebrow">E-mail</label><input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label className="eyebrow">Telefone</label><input className={input} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
            <div><label className="eyebrow">Banco</label><input className={input} value={f.banco} onChange={(e) => set("banco", e.target.value)} /></div>
            <div><label className="eyebrow">Agência</label><input className={input} value={f.agencia} onChange={(e) => set("agencia", e.target.value)} /></div>
            <div><label className="eyebrow">Conta</label><input className={input} value={f.conta} onChange={(e) => set("conta", e.target.value)} /></div>
            <div><label className="eyebrow">Chave PIX</label><input className={input} value={f.chave_pix} onChange={(e) => set("chave_pix", e.target.value)} /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={salvar} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar</button>
            <button onClick={() => setEditando(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </>
      )}
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}
    </div>
  );
}
