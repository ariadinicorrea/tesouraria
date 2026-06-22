import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeCautelas } from "@/lib/cautelas";
export const dynamic = "force-dynamic";
export async function GET() {
  const cautelas = await computeCautelas();
  return NextResponse.json({ ok: true, cautelas });
}
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.empresa_id || !b.serie) return NextResponse.json({ ok: false, erro: "Empresa e série são obrigatórios." }, { status: 400 });
  const { error, data } = await supabaseAdmin.from("cautelas").insert({
    empresa_id: b.empresa_id, serie: b.serie,
    quantidade_emitida: Number(String(b.quantidade_emitida ?? "").replace(",", ".")) || 0,
    valor_unitario: Number(String(b.valor_unitario ?? "").replace(",", ".")) || 0,
    vencimento: b.vencimento || null,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, cautela: data });
}
