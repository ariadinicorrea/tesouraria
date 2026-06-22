"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink";
const PAPEIS = [
  { v: "admin", l: "Administrador (vê tudo, gerencia usuários)" },
  { v: "gestor", l: "Gestor (vê e edita tudo)" },
  { v: "operador", l: "Operador (cadastra e movimenta)" },
  { v: "leitura", l: "Leitura (somente visualiza)" },
];
const rotuloPapel = (v: string) => PAPEIS.find((p) => p.v === v)?.v ?? v;

export function UsuariosAdmin({ usuarios }: { usuarios: any[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<any[]>(usuarios);
  const [nf, setNf] = useState({ nome: "", email: "", senha: "", papel: "operador" });
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function recarregar() {
    try { const r = await fetch("/api/usuarios", { cache: "no-store" }); const j = await r.json(); if (j.ok) setLista(j.usuarios); } catch {}
    router.refresh();
  }
  async function criar() {
    setBusy(true); setErro(null); setMsg(null);
    try {
      const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nf) });
      let j: any = null; try { j = await res.json(); } catch {}
      setBusy(false);
      if (!res.ok || !j || !j.ok) { setErro((j && j.erro) || `Falha (HTTP ${res.status}). Tente sair e entrar de novo.`); return; }
      setNf({ nome: "", email: "", senha: "", papel: "operador" }); setMsg("Usuário criado ✓"); await recarregar();
    } catch (e: any) {
      setBusy(false); setErro("Erro de conexão: " + (e?.message || "desconhecido"));
    }
  }
  async function mudarPapel(id: string, papel: string) {
    const res = await fetch(`/api/usuarios/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ papel }) });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setMsg("Papel atualizado ✓"); await recarregar();
  }
  async function excluir(id: string) {
    if (!confirm("Remover este usuário? Ele perde o acesso imediatamente.")) return;
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    const j = await res.json(); if (!j.ok) return setErro(j.erro);
    setMsg("Usuário removido ✓"); await recarregar();
  }

  return (
    <div>
      <div className="rounded-lg border bg-surface p-5">
        <div className="eyebrow">Novo usuário</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div><label className="eyebrow">Nome</label><input className={input} value={nf.nome} onChange={(e) => setNf({ ...nf, nome: e.target.value })} /></div>
          <div><label className="eyebrow">E-mail</label><input type="email" className={input} value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} /></div>
          <div><label className="eyebrow">Senha (mín. 6)</label><input type="text" className={input} value={nf.senha} onChange={(e) => setNf({ ...nf, senha: e.target.value })} /></div>
          <div><label className="eyebrow">Papel</label><select className={input} value={nf.papel} onChange={(e) => setNf({ ...nf, papel: e.target.value })}>{PAPEIS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={criar} disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Criando…" : "Criar usuário"}</button>
          {msg && <span className="text-sm text-accent">{msg}</span>}
          {erro && <span className="text-sm text-neg">{erro}</span>}
        </div>
        <p className="mt-2 text-xs text-muted">A senha é definida por você e entregue à pessoa. Ela entra direto (sem precisar confirmar e-mail).</p>
      </div>

      <div className="mt-6 rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Nome</th><th className="px-5 py-2 font-medium">E-mail</th>
            <th className="px-5 py-2 font-medium">Papel</th><th className="px-5 py-2"></th>
          </tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-5 py-3 font-medium">{u.nome || "—"}</td>
                <td className="px-5 py-3 text-muted">{u.email || "—"}</td>
                <td className="px-5 py-3">
                  <select className="rounded-md border bg-paper px-2 py-1 text-sm" value={u.papel} onChange={(e) => mudarPapel(u.id, e.target.value)}>
                    {PAPEIS.map((p) => <option key={p.v} value={p.v}>{rotuloPapel(p.v)}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-right"><button onClick={() => excluir(u.id)} className="rounded-md border border-neg px-3 py-1 text-xs text-neg hover:bg-neg hover:text-white">Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
