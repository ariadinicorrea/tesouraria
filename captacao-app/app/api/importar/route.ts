import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseCSV, num, data as parseData } from "@/lib/csv";
import { computeAporteAtual } from "@/lib/aporte";
import { calcularTributacao, iofAliquota } from "@/lib/funding-engine";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const tipo = b.tipo as string;
  const rows = parseCSV(b.texto || "");
  if (rows.length === 0) return NextResponse.json({ ok: false, erro: "Arquivo vazio ou sem linhas de dados." }, { status: 400 });

  const erros: { linha: number; motivo: string }[] = [];
  let inseridos = 0;
  const dig = (s: string) => String(s ?? "").replace(/\D/g, "");

  if (tipo === "investidores") {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.nome || !r.documento) { erros.push({ linha: i + 2, motivo: "nome e documento são obrigatórios" }); continue; }
      const { error } = await supabaseAdmin.from("investidores").insert({
        nome_razao_social: r.nome, documento: dig(r.documento), tipo_pessoa: (r.tipo_pessoa || "PF").toUpperCase() === "PJ" ? "PJ" : "PF",
        email: r.email || null, telefone: r.telefone || null, data_ingresso: parseData(r.data_ingresso),
        banco: r.banco || null, agencia: r.agencia || null, conta: r.conta || null, chave_pix: r.chave_pix || null,
      });
      if (error) erros.push({ linha: i + 2, motivo: error.message }); else inseridos++;
    }
  } else if (tipo === "agentes") {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.nome) { erros.push({ linha: i + 2, motivo: "nome é obrigatório" }); continue; }
      const { error } = await supabaseAdmin.from("agentes").insert({
        nome: r.nome, documento: r.documento ? dig(r.documento) : null, email: r.email || null,
        telefone: r.telefone || null, comissao_padrao: num(r.comissao_percent) / 100,
      });
      if (error) erros.push({ linha: i + 2, motivo: error.message }); else inseridos++;
    }
  } else if (tipo === "aportes") {
    const [invRes, empRes, instRes, agRes] = await Promise.all([
      supabaseAdmin.from("investidores").select("id, documento"),
      supabaseAdmin.from("empresas").select("id, nome"),
      supabaseAdmin.from("instrumentos_financeiros").select("id, nome"),
      supabaseAdmin.from("agentes").select("id, documento"),
    ]);
    const inv = new Map((invRes.data ?? []).map((x: any) => [dig(x.documento), x.id]));
    const emp = new Map((empRes.data ?? []).map((x: any) => [x.nome.trim().toLowerCase(), x.id]));
    const inst = new Map((instRes.data ?? []).map((x: any) => [x.nome.trim().toLowerCase(), x.id]));
    const ag = new Map((agRes.data ?? []).filter((x: any) => x.documento).map((x: any) => [dig(x.documento), x.id]));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const invId = inv.get(dig(r.documento_investidor));
      const empId = emp.get((r.empresa || "").trim().toLowerCase());
      const instId = inst.get((r.instrumento || "").trim().toLowerCase());
      if (!invId) { erros.push({ linha: i + 2, motivo: `investidor não encontrado (doc ${r.documento_investidor})` }); continue; }
      if (!empId) { erros.push({ linha: i + 2, motivo: `empresa não encontrada (${r.empresa})` }); continue; }
      if (!instId) { erros.push({ linha: i + 2, motivo: `instrumento não encontrado (${r.instrumento})` }); continue; }
      const modalidade = (r.modalidade || "percentual_cdi").trim();
      const insert: Record<string, unknown> = {
        investidor_id: invId, empresa_id: empId, instrumento_id: instId, codigo: r.codigo || null,
        data_aporte: parseData(r.data_aporte) || new Date().toISOString().slice(0, 10),
        valor_aporte: num(r.valor_aporte), tipo_remuneracao: modalidade,
        agente_id: r.agente_documento ? (ag.get(dig(r.agente_documento)) ?? null) : null,
        comissao_percentual: r.comissao_percent ? num(r.comissao_percent) / 100 : null,
      };
      if (modalidade === "percentual_cdi") insert.percentual_cdi = num(r.percentual_cdi);
      else { insert.taxa_valor = num(r.taxa_valor); insert.periodo_taxa = (r.periodo_taxa || "anual").trim(); }
      if (r.quantidade_cotas) insert.quantidade_cotas = num(r.quantidade_cotas);
      if (r.valor_cota_aporte) insert.valor_cota_aporte = num(r.valor_cota_aporte);
      const { error } = await supabaseAdmin.from("aportes").insert(insert);
      if (error) erros.push({ linha: i + 2, motivo: error.message }); else inseridos++;
    }
  } else if (tipo === "resgates") {
    const [invRes, empRes] = await Promise.all([
      supabaseAdmin.from("investidores").select("id, documento"),
      supabaseAdmin.from("empresas").select("id, nome"),
    ]);
    const inv = new Map((invRes.data ?? []).map((x: any) => [dig(x.documento), x.id]));
    const emp = new Map((empRes.data ?? []).map((x: any) => [x.nome.trim().toLowerCase(), x.id]));
    const hoje = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const invId = inv.get(dig(r.documento_investidor));
      const empId = emp.get((r.empresa || "").trim().toLowerCase());
      if (!invId) { erros.push({ linha: i + 2, motivo: `investidor não encontrado (doc ${r.documento_investidor})` }); continue; }
      if (!empId) { erros.push({ linha: i + 2, motivo: `empresa não encontrada (${r.empresa})` }); continue; }

      let q = supabaseAdmin.from("aportes").select("id, data_aporte").eq("investidor_id", invId).eq("empresa_id", empId).eq("status", "ativo");
      const dAporte = parseData(r.data_aporte);
      if (dAporte) q = q.eq("data_aporte", dAporte);
      const { data: aps } = await q;
      if (!aps || aps.length === 0) { erros.push({ linha: i + 2, motivo: "nenhum aporte ativo encontrado para esse investidor/empresa" }); continue; }
      if (aps.length > 1) { erros.push({ linha: i + 2, motivo: "vários aportes ativos — preencha a coluna data_aporte para identificar" }); continue; }

      const pos = await computeAporteAtual(aps[0].id);
      if (!pos) { erros.push({ linha: i + 2, motivo: "não foi possível calcular o aporte" }); continue; }

      const tipoR = (r.tipo_resgate || "total").trim();
      let valorBruto = 0, baseRend = 0;
      if (tipoR === "total") { valorBruto = pos.saldoBruto; baseRend = pos.rendimento; }
      else if (tipoR === "apenas_juros") { valorBruto = pos.rendimento; baseRend = pos.rendimento; }
      else { const pr = num(r.valor_principal), jr = num(r.valor_juros); valorBruto = pr + jr; baseRend = jr; if (valorBruto <= 0) { erros.push({ linha: i + 2, motivo: "informe valor_principal e/ou valor_juros" }); continue; } }

      const status = (r.status || "efetuado").trim() === "solicitado" ? "solicitado" : "efetuado";
      const iofAl = pos.regime === "isento" ? 0 : iofAliquota(pos.diasCorridos);
      const iof = baseRend * iofAl;
      const baseIr = Math.max(baseRend - iof, 0);
      const trib = calcularTributacao(pos.regime, baseIr, pos.diasCorridos);
      const valorLiquido = valorBruto - iof - trib.irRetido;

      const { error } = await supabaseAdmin.from("resgates").insert({
        aporte_id: aps[0].id, data_resgate: parseData(r.data_resgate) || hoje, tipo_resgate: tipoR,
        valor_bruto: valorBruto, base_calculo_ir: baseIr, aliquota_ir: trib.aliquota, ir_retido: trib.irRetido,
        base_iof: baseRend, iof_retido: iof, valor_liquido: valorLiquido, prazo_dias: pos.diasCorridos,
        status, efetuado_em: status === "efetuado" ? new Date().toISOString() : null,
      });
      if (error) { erros.push({ linha: i + 2, motivo: error.message }); continue; }
      if (tipoR === "total" && status === "efetuado") await supabaseAdmin.from("aportes").update({ status: "resgatado_total" }).eq("id", aps[0].id);
      inseridos++;
    }
  } else {
    return NextResponse.json({ ok: false, erro: "Tipo inválido." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, inseridos, erros, total: rows.length });
}
