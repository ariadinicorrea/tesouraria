"use client";
import { useState } from "react";

export function ResgateTabs({ geral, fundo }: { geral: React.ReactNode; fundo: React.ReactNode }) {
  const [aba, setAba] = useState<"geral" | "fundo">("geral");
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setAba("geral")} className={`rounded-md px-4 py-2 text-sm transition-colors ${aba === "geral" ? "bg-ink text-white" : "border text-ink/70 hover:bg-paper"}`}>Securitizadora / Contratos</button>
        <button onClick={() => setAba("fundo")} className={`rounded-md px-4 py-2 text-sm transition-colors ${aba === "fundo" ? "bg-ink text-white" : "border text-ink/70 hover:bg-paper"}`}>Fundo (cotas)</button>
      </div>
      <div className={aba === "geral" ? "" : "hidden"}>{geral}</div>
      <div className={aba === "fundo" ? "" : "hidden"}>{fundo}</div>
    </div>
  );
}
