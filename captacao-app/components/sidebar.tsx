"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = { href: string; label: string };
type Grupo = { label: string; sub: Item[] };
type Entrada = Item | Grupo;

const entradas: Entrada[] = [
  { href: "/dashboard", label: "Dashboard" },
  { label: "Emissões", sub: [
    { href: "/emissoes/securitizadora", label: "Securitizadora" },
    { href: "/emissoes/fundos", label: "Fundos" },
  ]},
  { label: "Operacional", sub: [
    { href: "/aportes", label: "Aportes" },
    { href: "/resgates", label: "Resgates" },
  ]},
  { label: "Cadastros", sub: [
    { href: "/investidores", label: "Investidores" },
    { href: "/agentes", label: "Agentes" },
  ]},
  { label: "Financeiro", sub: [
    { href: "/comissoes", label: "Comissões" },
    { href: "/tributos", label: "Tributos" },
  ]},
  { label: "Simulações", sub: [
    { href: "/simulacao", label: "Custo" },
    { href: "/proposta", label: "Proposta investidor" },
  ]},
  { label: "Configurações", sub: [
    { href: "/empresas", label: "Empresas" },
    { href: "/usuarios", label: "Usuários" },
    { href: "/importar", label: "Importar Excel" },
    { href: "/configuracoes", label: "Ajustes" },
  ]},
];

function ehGrupo(e: Entrada): e is Grupo { return (e as Grupo).sub !== undefined; }

export function Sidebar() {
  const path = usePathname();
  const grupoAtual = entradas.find((e) => ehGrupo(e) && e.sub.some((s) => path === s.href || path.startsWith(s.href + "/"))) as Grupo | undefined;
  const [aberto, setAberto] = useState<string | null>(grupoAtual?.label ?? null);
  useEffect(() => { if (grupoAtual) setAberto(grupoAtual.label); }, [grupoAtual?.label]);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-surface">
      <div className="border-b px-5 py-5">
        <div className="text-[0.95rem] font-semibold tracking-tight">Tesouraria</div>
        <div className="eyebrow mt-0.5">Gestão de captações</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {entradas.map((e) => {
          if (!ehGrupo(e)) {
            const ativo = path === e.href || path.startsWith(e.href + "/");
            return (<Link key={e.href} href={e.href} className={`mb-0.5 block rounded-md px-3 py-2 text-sm transition-colors ${ativo ? "bg-ink text-white" : "text-ink/70 hover:bg-paper hover:text-ink"}`}>{e.label}</Link>);
          }
          const isOpen = aberto === e.label;
          const temAtivo = e.sub.some((s) => path === s.href || path.startsWith(s.href + "/"));
          return (
            <div key={e.label} className="mb-0.5">
              <button onClick={() => setAberto(isOpen ? null : e.label)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${temAtivo ? "text-ink font-medium" : "text-ink/70 hover:bg-paper hover:text-ink"}`}>
                <span>{e.label}</span>
                <span className={`text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
              </button>
              {isOpen && (
                <div className="ml-2 border-l pl-2">
                  {e.sub.map((s) => {
                    const ativo = path === s.href || path.startsWith(s.href + "/");
                    return (<Link key={s.href} href={s.href} className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${ativo ? "bg-ink text-white" : "text-ink/60 hover:bg-paper hover:text-ink"}`}>{s.label}</Link>);
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t px-3 py-3">
        <button onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = "/login"; }} className="w-full rounded-md px-3 py-2 text-left text-sm text-ink/70 hover:bg-paper hover:text-ink">Sair</button>
      </div>
    </aside>
  );
}
