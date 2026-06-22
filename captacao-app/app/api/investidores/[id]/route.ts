import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeInvestidorPosicao } from "@/lib/investidor";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const pos = await computeInvestidorPosicao(params.id);
  if (!pos) return NextResponse.json({ ok: false, erro: "Investidor não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, ...pos });
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("investidores").update({
    nome_razao_social: b.nome_razao_social, documento: String(b.documento ?? "").replace(/\D/g, ""),
    tipo_pessoa: b.tipo_pessoa, email: b.email || null, telefone: b.telefone || null,
    data_ingresso: b.data_ingresso || null, data_nascimento: b.data_nascimento || null,
    observacoes: b.observacoes || null, banco: b.banco || null, agencia: b.agencia || null, conta: b.conta || null, chave_pix: b.chave_pix || null, updated_at: new Date().toISOString(),
  }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, investidor: data });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("investidor_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: `Não dá pra excluir: este investidor tem ${count} aporte(s) vinculado(s).` }, { status: 409 });
  const { error } = await supabaseAdmin.from("investidores").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
