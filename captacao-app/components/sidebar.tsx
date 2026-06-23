"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const itens = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/empresas", label: "Empresas" },
  {
    label: "Emissões",
    base: "/emissoes",
    sub: [
      { href: "/emissoes/securitizadora", label: "Securitizadora" },
      { href: "/emissoes/fundos", label: "Fundos" },
    ],
  },
  { href: "/investidores", label: "Investidores" },
  { href: "/aportes", label: "Aportes" },
  { href: "/resgates", label: "Resgates" },
  { href: "/agentes", label: "Agentes" },
  { href: "/comissoes", label: "Comissões" },
  { href: "/tributos", label: "Tributos" },
  { href: "/simulacao", label: "Simulação (custo)" },
  { href: "/proposta", label: "Proposta investidor" },
  { href: "/importar", label: "Importar Excel" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/usuarios", label: "Usuários" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-surface">
      <div className="border-b px-5 py-5">
        <div className="text-[0.95rem] font-semibold tracking-tight">Tesouraria</div>
        <div className="eyebrow mt-0.5">Gestão de captações</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {itens.map((it) => {
          if ("sub" in it && it.sub) {
            const abertoSecao = path.startsWith(it.base);
            return (
              <div key={it.label} className="mb-0.5">
                <div className={`block rounded-md px-3 py-2 text-sm ${abertoSecao ? "text-ink font-medium" : "text-ink/70"}`}>{it.label}</div>
                <div className="ml-2 border-l pl-2">
                  {it.sub.map((s) => {
                    const ativo = path === s.href || path.startsWith(s.href + "/");
                    return (
                      <Link key={s.href} href={s.href} className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${ativo ? "bg-ink text-white" : "text-ink/60 hover:bg-paper hover:text-ink"}`}>{s.label}</Link>
                    );
                  })}
                </div>
              </div>
            );
          }
          const ativo = path === it.href || path.startsWith(it.href + "/");
          return (<Link key={it.href} href={it.href} className={`block rounded-md px-3 py-2 text-sm transition-colors ${ativo ? "bg-ink text-white" : "text-ink/70 hover:bg-paper hover:text-ink"}`}>{it.label}</Link>);
        })}
      </nav>
      <div className="border-t px-3 py-3">
        <button onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = "/login"; }} className="w-full rounded-md px-3 py-2 text-left text-sm text-ink/70 hover:bg-paper hover:text-ink">Sair</button>
      </div>
    </aside>
  );
}
