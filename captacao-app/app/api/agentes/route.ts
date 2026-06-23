import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabaseAdmin.from("agentes").select("*").order("nome");
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, agentes: data });
}
export async function POST(req: Request) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("agentes").insert({
    nome: b.nome, documento: b.documento ? String(b.documento).replace(/\D/g, "") : null,
    email: b.email || null, telefone: b.telefone || null,
    comissao_padrao: (Number(String(b.comissao_padrao ?? "").replace(",", ".")) || 0) / 100,
    ativo: b.ativo !== false,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, agente: data });
}
