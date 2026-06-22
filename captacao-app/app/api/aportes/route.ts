import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabaseAdmin.from("aportes").select("*, empresas(nome), investidores(nome_razao_social)").order("data_aporte", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, aportes: data });
}
export async function POST(req: Request) {
  const b = await req.json();
  const insert: Record<string, unknown> = {
    empresa_id: b.empresa_id, investidor_id: b.investidor_id, instrumento_id: b.instrumento_id, codigo: b.codigo || null,
    data_aporte: b.data_aporte, valor_aporte: Number(b.valor_aporte), tipo_remuneracao: b.tipo_remuneracao,
    data_vencimento: b.data_vencimento || null, agente_id: b.agente_id || null, cautela_id: b.cautela_id || null,
    comissao_percentual: b.comissao_percentual ? (Number(String(b.comissao_percentual).replace(",", ".")) / 100) : null,
  };
  if (b.tipo_remuneracao === "percentual_cdi") insert.percentual_cdi = Number(b.percentual_cdi);
  else { insert.taxa_valor = Number(b.taxa_valor); insert.periodo_taxa = b.periodo_taxa; }
  if (b.quantidade_cotas) insert.quantidade_cotas = Number(b.quantidade_cotas);
  if (b.valor_cota_aporte) insert.valor_cota_aporte = Number(b.valor_cota_aporte);
  const { error, data } = await supabaseAdmin.from("aportes").insert(insert).select().single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, aporte: data });
}
