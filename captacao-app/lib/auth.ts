import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function papelAtual(): Promise<{ userId: string; email: string | null; papel: string } | null> {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin.from("perfis").select("papel").eq("id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? null, papel: data?.papel ?? "leitura" };
}
