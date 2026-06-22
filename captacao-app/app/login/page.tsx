"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) { setBusy(false); return setErro("E-mail ou senha incorretos."); }
    window.location.href = "/dashboard";
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-lg border bg-surface p-8">
        <div className="text-lg font-semibold tracking-tight">Tesouraria</div>
        <div className="eyebrow mt-0.5">Acesso ao sistema</div>
        <div className="mt-6 space-y-3">
          <div><label className="eyebrow">E-mail</label><input type="email" autoFocus className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="eyebrow">Senha</label><input type="password" className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        </div>
        {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
