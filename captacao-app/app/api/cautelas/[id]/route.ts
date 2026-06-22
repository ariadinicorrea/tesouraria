import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("cautelas").update({
    serie: b.serie,
    quantidade_emitida: Number(String(b.quantidade_emitida ?? "").replace(",", ".")) || 0,
    valor_unitario: Number(String(b.valor_unitario ?? "").replace(",", ".")) || 0,
    vencimento: b.vencimento || null, ativo: b.ativo,
  }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, cautela: data });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("cautela_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: `Não dá pra excluir: ${count} aporte(s) usam esta emissão. Você pode desativá-la.` }, { status: 409 });
  const { error } = await supabaseAdmin.from("cautelas").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
