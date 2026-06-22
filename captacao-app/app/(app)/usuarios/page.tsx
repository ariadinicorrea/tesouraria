import { papelAtual } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UsuariosAdmin } from "@/components/usuarios-admin";
export const dynamic = "force-dynamic";
export default async function UsuariosPage() {
  const p = await papelAtual();
  if (!p || p.papel !== "admin") {
    return <div className="p-8"><h1 className="text-xl font-semibold">Usuários</h1><p className="mt-3 text-sm text-muted">Acesso restrito a administradores.</p></div>;
  }
  const { data } = await supabaseAdmin.from("perfis").select("id, nome, email, papel, created_at").order("created_at");
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Sistema</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Usuários</h1></header>
      <UsuariosAdmin usuarios={(data ?? []) as any} />
    </div>
  );
}
