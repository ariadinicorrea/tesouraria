"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LimparDados() {
  const router = useRouter();
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function limpar(escopo: "aportes" | "tudo") {
    if (txt !== "APAGAR") { setErro('Digite APAGAR (em maiúsculas) no campo antes de apagar.'); return; }
    const msg = escopo === "aportes"
      ? "Apagar TODOS os aportes (e seus resgates/comissões)? Os investidores, agentes e empresas continuam. Não dá pra desfazer."
      : "Apagar TUDO: investidores, aportes, resgates e comissões? Não dá pra desfazer.";
    if (!confirm(msg)) return;
    setBusy(escopo); setErro(null); setRes(null);
    const r = await fetch("/api/limpar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmar: "APAGAR", escopo }) });
    const j = await r.json(); setBusy(null);
    if (!j.ok) return setErro(j.erro);
    setRes(j); setTxt(""); window.location.reload();
  }
  const nomes: Record<string, string> = { comissoes: "comissões", resgates: "resgates", aportes: "aportes", investidores: "investidores" };

  return (
    <div className="mt-6 rounded-lg border border-neg/40 bg-neg/5 p-5">
      <div className="eyebrow text-neg">Zona de perigo</div>
      <p className="mt-2 text-sm text-muted">Para corrigir uma importação errada: apague <b>só os aportes</b>, mantendo os investidores, e reimporte o arquivo corrigido. <b>Não dá pra desfazer.</b></p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Digite APAGAR" className="rounded-md border bg-paper px-3 py-2 text-sm" />
        <button onClick={() => limpar("aportes")} disabled={!!busy} className="rounded-md bg-warn px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "aportes" ? "Apagando…" : "Apagar só os aportes"}</button>
        <button onClick={() => limpar("tudo")} disabled={!!busy} className="rounded-md bg-neg px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "tudo" ? "Apagando…" : "Apagar tudo (incl. investidores)"}</button>
      </div>
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {res && (
        <div className="mt-3 text-sm">
          {res.tudoZerado
            ? <p className="text-accent">Apagado ✓ {res.escopo === "aportes" ? "(investidores mantidos) — agora reimporte o arquivo de aportes corrigido." : "— recarregue as telas (F5)."}</p>
            : <p className="font-medium text-neg">Atenção: parte não foi apagada (veja abaixo).</p>}
          <table className="mt-2 text-xs">
            <thead><tr className="text-muted"><th className="pr-4 text-left">Tabela</th><th className="pr-4 text-right">Tinha</th><th className="pr-4 text-right">Restou</th></tr></thead>
            <tbody>
              {Object.entries(res.result).map(([t, v]: any) => (
                <tr key={t}><td className="pr-4">{nomes[t] ?? t}</td><td className="pr-4 text-right">{v.antes}</td><td className={`pr-4 text-right ${v.depois > 0 ? "font-semibold text-neg" : "text-accent"}`}>{v.depois}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
