"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const brl = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ResgateAcoes({ resgateId, status, email, telefone, mensagem }: {
  resgateId: string; status: string; email: string; telefone: string; mensagem: string;
}) {
  const router = useRouter();
  const [efetuando, setEfetuando] = useState(false);
  const fone = (telefone || "").replace(/\D/g, "");
  const wpp = `https://wa.me/${fone.startsWith("55") ? fone : "55" + fone}?text=${encodeURIComponent(mensagem)}`;
  const mail = `mailto:${email}?subject=${encodeURIComponent("Comprovante de Resgate")}&body=${encodeURIComponent(mensagem)}`;

  async function efetuar() {
    setEfetuando(true);
    const res = await fetch(`/api/resgates/${resgateId}`, { method: "PATCH" });
    const j = await res.json(); setEfetuando(false);
    if (j.ok) window.location.reload();
  }
  return (
    <div className="mb-4 flex flex-wrap gap-2 no-print">
      {status === "solicitado" && (
        <button onClick={efetuar} disabled={efetuando} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {efetuando ? "..." : "Marcar como efetuado"}
        </button>
      )}
      <button onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white">Imprimir / Salvar PDF</button>
      {email && <a href={mail} className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Enviar por e-mail</a>}
      {fone && <a href={wpp} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1.5 text-sm hover:bg-paper">Enviar por WhatsApp</a>}
    </div>
  );
}
