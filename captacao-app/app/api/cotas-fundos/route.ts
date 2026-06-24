import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const b = await req.json();
  const empresa_id = b.empresa_id;
  const serie = (b.serie ?? "").trim();
  const valor_inicial = Number(String(b.valor_inicial ?? "").replace(",", ".")) || 0;
  const tipo_remuneracao = b.tipo_remuneracao || "percentual_cdi";

  if (!empresa_id) return NextResponse.json({ ok: false, erro: "Selecione o fundo." }, { status: 400 });
  if (!serie) return NextResponse.json({ ok: false, erro: "Informe a série da cota." }, { status: 400 });
  if (valor_inicial <= 0) return NextResponse.json({ ok: false, erro: "Valor inicial deve ser maior que zero." }, { status: 400 });

  const insert: Record<string, unknown> = { empresa_id, serie, valor_inicial, data_inicio: null, tipo_remuneracao };
  if (tipo_remuneracao === "percentual_cdi") {
    insert.percentual_cdi = Number(String(b.percentual_cdi ?? "").replace(",", ".")) || 0;
  } else {
    insert.taxa_valor = Number(String(b.taxa_valor ?? "").replace(",", ".")) || 0;
    insert.periodo_taxa = b.periodo_taxa || "anual";
  }

  const { error, data } = await supabaseAdmin.from("cotas").insert(insert).select("id").single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  try {
    const { count, error: errCount } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("cota_id", id);
    if (!errCount && (count ?? 0) > 0) return NextResponse.json({ ok: false, erro: "Esta cota já tem aportes vinculados e não pode ser excluída." }, { status: 400 });
  } catch (_) {}
  const { error } = await supabaseAdmin.from("cotas").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
