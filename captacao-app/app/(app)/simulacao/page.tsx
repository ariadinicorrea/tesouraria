import { computeAportesAtivos } from "@/lib/aporte";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Simulador } from "@/components/simulador";

export const dynamic = "force-dynamic";

export default async function SimulacaoPage() {
  const aportes = await computeAportesAtivos();
  const posicoes = aportes.map((a) => ({ saldoBruto: a.saldoBruto, taxaEfetivaAnual: a.taxaEf }));
  const { data: cdiRow } = await supabaseAdmin.from("cdi_historico").select("taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  const cdi = cdiRow ? Number(cdiRow.taxa_anual) : 0;
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Planejamento</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Simulação de custo</h1></header>
      <Simulador posicoes={posicoes} cdi={cdi} />
    </div>
  );
}
