"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ConfigLogo({ logoAtual }: { logoAtual: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(logoAtual);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null); setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { setErro("Imagem muito grande. Use uma menor que 1MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }
  async function salvar() {
    setSalvando(true); setErro(null); setMsg(null);
    const res = await fetch("/api/configuracoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_data_url: preview }) });
    const j = await res.json(); setSalvando(false);
    if (!j.ok) return setErro(j.erro);
    setMsg("Logo salvo! Já aparece nos relatórios."); router.refresh();
  }
  async function remover() {
    setPreview(null);
    await fetch("/api/configuracoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_data_url: null }) });
    setMsg("Logo removido."); router.refresh();
  }
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="eyebrow">Logo da empresa (aparece nos relatórios e comprovantes)</div>
      {preview && <img src={preview} alt="Logo" className="mt-3 h-16 max-w-[220px] object-contain" />}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" accept="image/*" onChange={escolher} className="text-sm" />
        <button onClick={salvar} disabled={salvando || !preview} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Salvando…" : "Salvar logo"}</button>
        {preview && <button onClick={remover} className="rounded-md border px-4 py-2 text-sm">Remover</button>}
      </div>
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}
      <p className="mt-2 text-xs text-muted">Dica: use PNG ou JPG com fundo claro/transparente, menor que 1MB.</p>
    </div>
  );
}
