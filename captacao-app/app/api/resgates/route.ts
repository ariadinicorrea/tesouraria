import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeAporteAtual } from "@/lib/aporte";
import { calcularTributacao, iofAliquota } from "@/lib/funding-engine";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const pos = await computeAporteAtual(b.aporte_id);
  if (!pos) return NextResponse.json({ ok: false, erro: "Aporte não encontrado" }, { status: 404 });
  const tipo = b.tipo_resgate as "parcial" | "total" | "apenas_juros";
  const status = b.status === "solicitado" ? "solicitado" : "efetuado";

  let valorBruto = 0, baseRend = 0;
  if (tipo === "total") { valorBruto = pos.saldoBruto; baseRend = pos.rendimento; }
  else if (tipo === "apenas_juros") { valorBruto = pos.rendimento; baseRend = pos.rendimento; }
  else {
    const principal = Number(b.valor_principal) || 0;
    const juros = Number(b.valor_juros) || 0;
    if (principal + juros <= 0) return NextResponse.json({ ok: false, erro: "Informe principal e/ou juros" }, { status: 400 });
    if (juros > pos.rendimento + 0.01) return NextResponse.json({ ok: false, erro: `Juros maior que o rendimento disponível (${pos.rendimento.toFixed(2)})` }, { status: 400 });
    if (principal + juros > pos.saldoBruto + 0.01) return NextResponse.json({ ok: false, erro: "Total maior que o saldo disponível" }, { status: 400 });
    valorBruto = principal + juros; baseRend = juros;
  }

  // IOF: só para regimes tributados e resgate antes de 30 dias
  const iofAl = pos.regime === "isento" ? 0 : iofAliquota(pos.diasCorridos);
  const iof = baseRend * iofAl;
  const baseIr = Math.max(baseRend - iof, 0);
  const trib = calcularTributacao(pos.regime, baseIr, pos.diasCorridos);
  const valorLiquido = valorBruto - iof - trib.irRetido;

  const { error } = await supabaseAdmin.from("resgates").insert({
    aporte_id: b.aporte_id, data_resgate: b.data_resgate || new Date().toISOString().slice(0, 10),
    tipo_resgate: tipo, valor_solicitado: tipo === "parcial" ? valorBruto : null,
    valor_bruto: valorBruto, base_calculo_ir: baseIr, aliquota_ir: trib.aliquota, ir_retido: trib.irRetido,
    base_iof: baseRend, iof_retido: iof, valor_liquido: valorLiquido, prazo_dias: pos.diasCorridos,
    status, efetuado_em: status === "efetuado" ? new Date().toISOString() : null,
  });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  if (tipo === "total" && status === "efetuado") await supabaseAdmin.from("aportes").update({ status: "resgatado_total" }).eq("id", b.aporte_id);
  return NextResponse.json({ ok: true, valorBruto, iofRetido: iof, irRetido: trib.irRetido, aliquota: trib.aliquota, valorLiquido, status });
}
