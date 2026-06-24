"use client";
import { useState } from "react";

export function SecuritizadoraTabs({ estoque, relatorios }: { estoque: React.ReactNode; relatorios: React.ReactNode }) {
  const [aba, setAba] = useState<"estoque" | "relatorios">("estoque");
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setAba("estoque")} className={`rounded-md px-4 py-2 text-sm transition-colors ${aba === "estoque" ? "bg-ink text-white" : "border text-ink/70 hover:bg-paper"}`}>Estoque & Emissão</button>
        <button onClick={() => setAba("relatorios")} className={`rounded-md px-4 py-2 text-sm transition-colors ${aba === "relatorios" ? "bg-ink text-white" : "border text-ink/70 hover:bg-paper"}`}>Relatórios</button>
      </div>
      <div className={aba === "estoque" ? "" : "hidden"}>{estoque}</div>
      <div className={aba === "relatorios" ? "" : "hidden"}>{relatorios}</div>
    </div>
  );
}
