import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("agentes").update({
    nome: b.nome, documento: b.documento ? String(b.documento).replace(/\D/g, "") : null,
    email: b.email || null, telefone: b.telefone || null,
    comissao_padrao: (Number(String(b.comissao_padrao ?? "").replace(",", ".")) || 0) / 100, ativo: b.ativo,
  }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, agente: data });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("agente_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: `Não dá pra excluir: este agente tem ${count} aporte(s) vinculado(s). Você pode desativá-lo.` }, { status: 409 });
  const { error } = await supabaseAdmin.from("agentes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
