import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabaseAdmin.from("empresas").select("*").order("nome");
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, empresas: data });
}
export async function POST(req: Request) {
  const b = await req.json();
  const { error, data } = await supabaseAdmin.from("empresas").insert({
    nome: b.nome, tipo: b.tipo, cnpj: b.cnpj ? String(b.cnpj).replace(/\D/g, "") : null,
    regime_tributario: b.regime_tributario, ativo: b.ativo ?? true,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, empresa: data });
}
