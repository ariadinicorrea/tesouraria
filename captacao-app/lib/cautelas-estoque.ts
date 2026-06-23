import { supabaseAdmin } from "@/lib/supabase/admin";

export type CautelaRow = {
  id: string; empresa_id: string; serie: string | null;
  codigo: number | null; valor: number; status: string; aporte_id: string | null;
};

export async function listarSecuritizadoras() {
  const { data } = await supabaseAdmin.from("empresas")
    .select("id, nome").eq("tipo", "securitizadora").eq("ativo", true).order("nome");
  return data ?? [];
}

export async function listarCautelas(empresaId?: string) {
  let q = supabaseAdmin.from("cautelas")
    .select("id, empresa_id, serie, codigo, valor, status, aporte_id")
    .order("codigo", { ascending: true });
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data } = await q;
  return (data ?? []) as CautelaRow[];
}

export async function proximoCodigo(empresaId: string): Promise<number> {
  const { data } = await supabaseAdmin.from("cautelas")
    .select("codigo").eq("empresa_id", empresaId)
    .order("codigo", { ascending: false }).limit(1).maybeSingle();
  return (data?.codigo ?? 0) + 1;
}
