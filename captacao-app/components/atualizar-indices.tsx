"use client";
import { useState } from "react";
import { Card } from "@/components/ui";

export function AtualizarIndices() {
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar() {
    setCarregando(true); setMsg(null); setErro(null);
    try {
      const r = await fetch("/api/cron/indices", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) { setErro(j.erro || "Falha ao atualizar."); }
      else {
        const partes = [];
        partes.push(`CDI: ${j.cdi ?? 0} registro(s)`);
        partes.push(`Selic: ${j.selic ?? 0} registro(s)`);
        if (j.cdiErro) partes.push(`(CDI erro: ${j.cdiErro})`);
        if (j.selicErro) partes.push(`(Selic erro: ${j.selicErro})`);
        setMsg(partes.join(" · "));
      }
    } catch (e) {
      setErro("Não foi possível conectar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-col gap-3">
        <div>
          <div className="eyebrow">Índices</div>
          <h2 className="mt-1 text-base font-semibold">Atualizar CDI / Selic</h2>
          <p className="mt-1 text-sm text-muted">
            Busca no Banco Central os dias mais recentes e grava no sistema. O CDI sai com 1 dia útil de
            defasagem (fim de semana e feriado não têm publicação).
          </p>
        </div>
        <div>
          <button onClick={atualizar} disabled={carregando}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {carregando ? "Atualizando..." : "Atualizar agora"}
          </button>
        </div>
        {msg && <div className="rounded-md border bg-surface px-3 py-2 text-sm text-ink">✅ {msg}</div>}
        {erro && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </div>
    </Card>
  );
}
