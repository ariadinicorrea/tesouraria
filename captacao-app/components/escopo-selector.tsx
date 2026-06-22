"use client";
import { useRouter } from "next/navigation";

export function EscopoSelector({ empresas, atual }: { empresas: { id: string; nome: string }[]; atual: string }) {
  const router = useRouter();
  return (
    <select
      value={atual}
      onChange={(e) => router.push(`/dashboard?escopo=${e.target.value}`)}
      className="rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
    >
      <option value="consolidado">Consolidado do grupo</option>
      {empresas.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
    </select>
  );
}
