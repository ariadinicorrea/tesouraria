import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Resgate de fundo: baixa frações de cota de um aporte.
// body: { aporte_id, modo: "valor"|"quantidade", valor?, quantidade?, valor_cota_dia, data_resgate, status }
export async function POST(req: Request) {
  const b = await req.json();
  const aporte_id = b.aporte_id;
  if (!aporte_id) return NextResponse.json({ ok: false, erro: "Selecione o aporte." }, { status: 400 });

  const { data: ap } = await supabaseAdmin.from("aportes").select("*").eq("id", aporte_id).maybeSingle();
  if (!ap) return NextResponse.json({ ok: false, erro: "Aporte não encontrado." }, { status: 404 });

  const vCota = Number(String(b.valor_cota_dia ?? "").replace(",", ".")) || 0;
  if (vCota <= 0) return NextResponse.json({ ok: false, erro: "Valor da cota inválido." }, { status: 400 });

  const qtdAtual = Number(ap.quantidade_cotas ?? 0);
  let qtdResgatar = 0;
  if (b.modo === "quantidade") qtdResgatar = Number(String(b.quantidade ?? "").replace(",", ".")) || 0;
  else { const v = Number(String(b.valor ?? "").replace(",", ".")) || 0; qtdResgatar = vCota > 0 ? v / vCota : 0; }

  if (qtdResgatar <= 0) return NextResponse.json({ ok: false, erro: "Informe o valor ou a quantidade." }, { status: 400 });
  if (qtdResgatar > qtdAtual + 1e-9) return NextResponse.json({ ok: false, erro: `Máximo resgatável: ${qtdAtual.toLocaleString("pt-BR")} cotas.` }, { status: 400 });

  const valorBruto = qtdResgatar * vCota;
  const total = qtdResgatar >= qtdAtual - 1e-9;
  const status = b.status === "solicitado" ? "solicitado" : "efetuado";

  // grava o resgate
  const insert: Record<string, unknown> = {
    aporte_id, tipo_resgate: total ? "total" : "parcial", status,
    data_resgate: b.data_resgate, valor_bruto: valorBruto,
    base_calculo_ir: 0, ir_retido: 0, valor_liquido: valorBruto,
    quantidade_cotas_resgatadas: qtdResgatar,
  };
  const { error } = await supabaseAdmin.from("resgates").insert(insert);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });

  // baixa as cotas do aporte (se efetuado)
  if (status === "efetuado") {
    const novaQtd = qtdAtual - qtdResgatar;
    if (total) {
      await supabaseAdmin.from("aportes").update({ status: "resgatado_total", quantidade_cotas: 0 }).eq("id", aporte_id);
    } else {
      await supabaseAdmin.from("aportes").update({ quantidade_cotas: novaQtd }).eq("id", aporte_id);
    }
  }
  return NextResponse.json({ ok: true, valorBruto, qtdResgatada: qtdResgatar, total });
}
