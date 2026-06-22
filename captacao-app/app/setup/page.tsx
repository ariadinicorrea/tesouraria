"use client";
import { useState } from "react";

export default function SetupPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) { setErro("A senha precisa ter pelo menos 6 caracteres."); return; }
    setBusy(true); setErro(null);
    const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, email: email.trim(), senha }) });
    const j = await res.json(); setBusy(false);
    if (!j.ok) return setErro(j.erro);
    setOk(true);
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm rounded-lg border bg-surface p-8">
        <div className="text-lg font-semibold tracking-tight">Primeiro acesso</div>
        <div className="eyebrow mt-0.5">Crie o usuário administrador</div>
        {ok ? (
          <div className="mt-6"><p className="text-sm text-accent">Administrador criado! 🎉</p><a href="/login" className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Ir para o login</a></div>
        ) : (
          <form onSubmit={criar}>
            <div className="mt-6 space-y-3">
              <div><label className="eyebrow">Seu nome</label><input className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div><label className="eyebrow">E-mail</label><input type="email" className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="eyebrow">Senha (mín. 6)</label><input type="password" className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            </div>
            {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
            <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Criando…" : "Criar administrador"}</button>
          </form>
        )}
        <p className="mt-4 text-xs text-muted">Esta tela só funciona enquanto não existir nenhum usuário. Depois, use a tela de Usuários para adicionar a equipe.</p>
      </div>
    </div>
  );
}
