import { supabaseAdmin } from "@/lib/supabase/admin";
import { AgentesAdmin } from "@/components/agentes-admin";
export const dynamic = "force-dynamic";
export default async function AgentesPage() {
  const { data: agentes } = await supabaseAdmin.from("agentes").select("*").order("nome");
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Cadastro</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Agentes captadores</h1></header>
      <AgentesAdmin agentes={(agentes ?? []) as any} />
    </div>
  );
}
