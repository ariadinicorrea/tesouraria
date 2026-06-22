import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabaseAdmin.from("investidores").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, investidores: data });
}
export async function POST(req: Request) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("investidores").insert({
    nome_razao_social: b.nome_razao_social, documento: String(b.documento ?? "").replace(/\D/g, ""),
    tipo_pessoa: b.tipo_pessoa, email: b.email || null, telefone: b.telefone || null,
    data_ingresso: b.data_ingresso || null, data_nascimento: b.data_nascimento || null, observacoes: b.observacoes || null,
    banco: b.banco || null, agencia: b.agencia || null, conta: b.conta || null, chave_pix: b.chave_pix || null,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, investidor: data });
}
