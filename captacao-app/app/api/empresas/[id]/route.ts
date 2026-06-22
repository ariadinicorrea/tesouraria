import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("empresas").update({
    nome: b.nome, tipo: b.tipo, cnpj: b.cnpj ? String(b.cnpj).replace(/\D/g, "") : null,
    regime_tributario: b.regime_tributario, ativo: b.ativo,
  }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, empresa: data });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("empresa_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: `Não dá pra excluir: esta empresa tem ${count} aporte(s) vinculado(s). Você pode desativá-la em vez de excluir.` }, { status: 409 });
  const { error } = await supabaseAdmin.from("empresas").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
