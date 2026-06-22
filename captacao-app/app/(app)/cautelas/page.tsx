import { computeCautelas } from "@/lib/cautelas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CautelasAdmin } from "@/components/cautelas-admin";
export const dynamic = "force-dynamic";
export default async function CautelasPage() {
  const [cautelas, empresasRes] = await Promise.all([
    computeCautelas(),
    supabaseAdmin.from("empresas").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Securitizadora / Fundos</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Cautelas e cotas (emissões)</h1></header>
      <CautelasAdmin cautelas={cautelas as any} empresas={(empresasRes.data ?? []) as any} />
    </div>
  );
}
