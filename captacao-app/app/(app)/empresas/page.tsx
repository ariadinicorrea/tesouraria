import { supabaseAdmin } from "@/lib/supabase/admin";
import { EmpresasAdmin } from "@/components/empresas-admin";
export const dynamic = "force-dynamic";
export default async function EmpresasPage() {
  const { data: empresas } = await supabaseAdmin.from("empresas").select("*").order("nome");
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Cadastro</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Empresas</h1></header>
      <EmpresasAdmin empresas={(empresas ?? []) as any} />
    </div>
  );
}
