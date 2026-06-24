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
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : (id ? [id] : []);
  if (ids.length === 0) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  let comAporte = new Set();
  try {
    const { data: aps } = await supabaseAdmin.from("aportes").select("cota_id").in("cota_id", ids);
    for (const a of aps ?? []) if (a.cota_id) comAporte.add(a.cota_id);
  } catch (_) {}
  const excluiveis = ids.filter((x) => !comAporte.has(x));
  if (excluiveis.length === 0) return NextResponse.json({ ok: false, erro: "Nenhuma cota livre para excluir (cotas com aporte não podem)." }, { status: 400 });
  const { error } = await supabaseAdmin.from("cotas").delete().in("id", excluiveis);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, excluidas: excluiveis.length, ignoradas: ids.length - excluiveis.length });
}


export async function PATCH(req: Request) {
  const b = await req.json();
  const id = b.id;
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  let temAporte = false;
  try {
    const { count } = await supabaseAdmin.from("aportes").select("id", { count: "exact", head: true }).eq("cota_id", id);
    temAporte = (count ?? 0) > 0;
  } catch (_) {}
  if (temAporte) return NextResponse.json({ ok: false, erro: "Esta cota já tem aportes e não pode ser editada." }, { status: 400 });
  const upd = {};
  if (b.serie !== undefined) upd.serie = String(b.serie).trim();
  if (b.valor_inicial !== undefined) {
    const v = Number(String(b.valor_inicial).replace(",", ".")) || 0;
    if (v <= 0) return NextResponse.json({ ok: false, erro: "Valor inicial deve ser maior que zero." }, { status: 400 });
    upd.valor_inicial = v;
  }
  if (b.tipo_remuneracao !== undefined) {
    upd.tipo_remuneracao = b.tipo_remuneracao;
    if (b.tipo_remuneracao === "percentual_cdi") { upd.percentual_cdi = Number(String(b.percentual_cdi ?? "").replace(",", ".")) || 0; upd.taxa_valor = null; upd.periodo_taxa = null; }
    else { upd.taxa_valor = Number(String(b.taxa_valor ?? "").replace(",", ".")) || 0; upd.periodo_taxa = b.periodo_taxa || "anual"; upd.percentual_cdi = null; }
  }
  const { error } = await supabaseAdmin.from("cotas").update(upd).eq("id", id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
