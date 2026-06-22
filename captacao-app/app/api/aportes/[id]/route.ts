import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const upd: Record<string, unknown> = {
    empresa_id: b.empresa_id, investidor_id: b.investidor_id, instrumento_id: b.instrumento_id, codigo: b.codigo || null,
    data_aporte: b.data_aporte, valor_aporte: Number(b.valor_aporte), tipo_remuneracao: b.tipo_remuneracao,
    data_vencimento: b.data_vencimento || null, agente_id: b.agente_id || null, cautela_id: b.cautela_id || null,
    comissao_percentual: b.comissao_percentual !== "" && b.comissao_percentual != null
      ? Number(String(b.comissao_percentual).replace(",", ".")) / 100 : null,
    percentual_cdi: null, taxa_valor: null, periodo_taxa: null, quantidade_cotas: null, valor_cota_aporte: null,
  };
  if (b.tipo_remuneracao === "percentual_cdi") upd.percentual_cdi = Number(b.percentual_cdi);
  else { upd.taxa_valor = Number(b.taxa_valor); upd.periodo_taxa = b.periodo_taxa; }
  if (b.quantidade_cotas) upd.quantidade_cotas = Number(b.quantidade_cotas);
  if (b.valor_cota_aporte) upd.valor_cota_aporte = Number(b.valor_cota_aporte);
  const { error } = await supabaseAdmin.from("aportes").update(upd).eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin.from("resgates").select("id", { count: "exact", head: true }).eq("aporte_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: "Não dá pra excluir: este aporte tem resgates vinculados. Exclua os resgates primeiro." }, { status: 400 });
  const { error } = await supabaseAdmin.from("aportes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
