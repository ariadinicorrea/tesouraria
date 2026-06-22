import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const { data: r } = await supabaseAdmin.from("resgates").select("aporte_id, tipo_resgate").eq("id", params.id).maybeSingle();
  const { error } = await supabaseAdmin.from("resgates")
    .update({ status: "efetuado", efetuado_em: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  if (r?.tipo_resgate === "total") await supabaseAdmin.from("aportes").update({ status: "resgatado_total" }).eq("id", r.aporte_id);
  return NextResponse.json({ ok: true });
}
