import { supabaseAdmin } from "@/lib/supabase/admin";
import { ComissoesFechamento } from "@/components/comissoes-fechamento";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";
export default async function ComissoesPage() {
  noStore();
  const [comRes, agRes] = await Promise.all([
    supabaseAdmin.from("comissoes").select("*, aportes(data_aporte, valor_aporte, investidores(nome_razao_social), empresas(nome)), agentes(nome)").order("competencia", { ascending: false }),
    supabaseAdmin.from("agentes").select("id, nome").order("nome"),
  ]);
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Financeiro</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Comissões de captação</h1></header>
      <ComissoesFechamento comissoes={(comRes.data ?? []) as any} agentes={(agRes.data ?? []) as any} />
    </div>
  );
}
