import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLogo } from "@/lib/config";
import { PropostaInvestimento } from "@/components/proposta-investimento";
export const dynamic = "force-dynamic";
export default async function PropostaPage() {
  const [{ data: cdi }, logo] = await Promise.all([
    supabaseAdmin.from("cdi_historico").select("taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle(),
    getLogo(),
  ]);
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Comercial</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Proposta de investimento</h1></header>
      <PropostaInvestimento cdiAtual={cdi ? Number(cdi.taxa_anual) : 0} logo={logo} />
    </div>
  );
}
