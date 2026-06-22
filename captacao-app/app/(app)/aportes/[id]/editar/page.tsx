import { supabaseAdmin } from "@/lib/supabase/admin";
import { EditarAporte } from "@/components/editar-aporte";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function EditarAportePage({ params }: { params: { id: string } }) {
  const [aRes, empresasRes, investidoresRes, instrumentosRes, agentesRes, cautelasRes] = await Promise.all([
    supabaseAdmin.from("aportes").select("*").eq("id", params.id).maybeSingle(),
    supabaseAdmin.from("empresas").select("id, nome").eq("ativo", true).order("nome"),
    supabaseAdmin.from("investidores").select("id, nome_razao_social").order("nome_razao_social"),
    supabaseAdmin.from("instrumentos_financeiros").select("id, nome, baseado_em_cotas").order("nome"),
    supabaseAdmin.from("agentes").select("id, nome, comissao_padrao").eq("ativo", true).order("nome"),
    supabaseAdmin.from("cautelas").select("id, empresa_id, serie").eq("ativo", true).order("serie"),
  ]);
  if (!aRes.data) return <div className="p-8">Aporte não encontrado. <Link href="/aportes" className="text-accent">Voltar</Link></div>;
  return (
    <div className="p-8">
      <header className="mb-6 flex items-end justify-between">
        <div><div className="eyebrow">Operações</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Editar aporte</h1></div>
        <Link href="/aportes" className="text-sm text-muted hover:text-ink">← Voltar para aportes</Link>
      </header>
      <EditarAporte aporte={aRes.data} empresas={empresasRes.data ?? []} investidores={investidoresRes.data ?? []} instrumentos={instrumentosRes.data ?? []} agentes={(agentesRes.data ?? []) as any} cautelas={(cautelasRes.data ?? []) as any} />
    </div>
  );
}
