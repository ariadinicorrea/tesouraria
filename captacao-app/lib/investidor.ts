import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  taxaEfetivaAnual, saldoBrutoAtualizado, contarDiasUteis, custoCaptacao,
  calcularTributacao, posicaoCotasFIDC, taxaMediaPonderada,
  type ParametrosRemuneracao, type RegimeTributario,
} from "@/lib/funding-engine";

export interface PosicaoAporte {
  aporteId: string; empresa: string; instrumento: string;
  dataAporte: string; dataVencimento: string | null;
  valorAportado: number; saldoBruto: number; rendimento: number;
  irEstimado: number; saldoLiquido: number; taxaEfetivaAnual: number;
  custoMensal: number; diasCorridos: number; aliquotaIR: number;
}
export interface InvestidorPosicao {
  investidor: any; cdiAtual: number; posicoes: PosicaoAporte[];
  taxaMediaPonderadaAnual: number;
  totais: { valorAportado: number; saldoBruto: number; rendimento: number; irEstimado: number; saldoLiquido: number; custoMensal: number };
}

async function cdiVigente(): Promise<number> {
  const { data } = await supabaseAdmin.from("cdi_historico").select("taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.taxa_anual) : 0;
}
async function valorCotaAtual(empresaId: string): Promise<number | null> {
  const { data } = await supabaseAdmin.from("cotas_valor_historico").select("valor_cota").eq("empresa_id", empresaId).order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.valor_cota) : null;
}
async function resgatesEfetuados(aporteId: string): Promise<{ bruto: number; principal: number }> {
  const { data } = await supabaseAdmin.from("resgates")
    .select("valor_bruto, base_calculo_ir, status").eq("aporte_id", aporteId).eq("status", "efetuado");
  let bruto = 0, principal = 0;
  for (const r of data ?? []) { const vb = Number(r.valor_bruto); bruto += vb; principal += vb - Number(r.base_calculo_ir); }
  return { bruto, principal };
}

export async function computeInvestidorPosicao(investidorId: string): Promise<InvestidorPosicao | null> {
  const { data: investidor } = await supabaseAdmin.from("investidores").select("*").eq("id", investidorId).maybeSingle();
  if (!investidor) return null;
  const cdi = await cdiVigente();
  const { data: aportes } = await supabaseAdmin.from("aportes")
    .select(`*, empresas!inner(nome, tipo, regime_tributario), instrumentos_financeiros!inner(nome, baseado_em_cotas, isento_ir)`)
    .eq("investidor_id", investidorId).eq("status", "ativo");

  const hoje = new Date();
  const posicoes: PosicaoAporte[] = [];
  for (const a of aportes ?? []) {
    const emp = Array.isArray(a.empresas) ? a.empresas[0] : a.empresas;
    const instr = Array.isArray(a.instrumentos_financeiros) ? a.instrumentos_financeiros[0] : a.instrumentos_financeiros;
    const params: ParametrosRemuneracao = {
      tipo: a.tipo_remuneracao, taxaValor: a.taxa_valor ?? undefined,
      periodo: a.periodo_taxa ?? undefined, percentualCdi: a.percentual_cdi ?? undefined,
    };
    const taxaEf = taxaEfetivaAnual(params, cdi);
    const dataAporte = new Date(a.data_aporte);
    const diasUteis = contarDiasUteis(dataAporte, hoje);
    const diasCorridos = Math.floor((hoje.getTime() - dataAporte.getTime()) / 86400000);
    const cotaAtual = instr?.baseado_em_cotas ? await valorCotaAtual(a.empresa_id) : null;
    let saldoBruto: number; let rendimento: number;
    if (cotaAtual && a.quantidade_cotas && a.valor_cota_aporte) {
      const p = posicaoCotasFIDC(a.quantidade_cotas, a.valor_cota_aporte, cotaAtual);
      saldoBruto = p.patrimonioBruto; rendimento = p.rendimentoBruto;
    } else {
      saldoBruto = saldoBrutoAtualizado(a.valor_aporte, taxaEf, diasUteis);
      rendimento = saldoBruto - a.valor_aporte;
    }
    const res = await resgatesEfetuados(a.id);
    const principalVigente = a.valor_aporte - res.principal;
    saldoBruto -= res.bruto; if (saldoBruto < 0) saldoBruto = 0;
    rendimento = saldoBruto - principalVigente; if (rendimento < 0) rendimento = 0;
    const regime: RegimeTributario =
      instr?.isento_ir || emp?.tipo === "contratos" ? "isento" : (emp?.regime_tributario as RegimeTributario);
    const trib = calcularTributacao(regime, rendimento, diasCorridos);
    const custo = custoCaptacao(saldoBruto, taxaEf);
    posicoes.push({
      aporteId: a.id, empresa: emp?.nome, instrumento: instr?.nome,
      dataAporte: a.data_aporte, dataVencimento: a.data_vencimento, valorAportado: a.valor_aporte,
      saldoBruto, rendimento, irEstimado: trib.irRetido, saldoLiquido: saldoBruto - trib.irRetido,
      taxaEfetivaAnual: taxaEf, custoMensal: custo.mensal, diasCorridos, aliquotaIR: trib.aliquota,
    });
  }
  const totais = posicoes.reduce((t, p) => ({
    valorAportado: t.valorAportado + p.valorAportado, saldoBruto: t.saldoBruto + p.saldoBruto,
    rendimento: t.rendimento + p.rendimento, irEstimado: t.irEstimado + p.irEstimado,
    saldoLiquido: t.saldoLiquido + p.saldoLiquido, custoMensal: t.custoMensal + p.custoMensal,
  }), { valorAportado: 0, saldoBruto: 0, rendimento: 0, irEstimado: 0, saldoLiquido: 0, custoMensal: 0 });
  const tmp = taxaMediaPonderada(posicoes.map((p) => ({ saldoBruto: p.saldoBruto, taxaEfetivaAnual: p.taxaEfetivaAnual })));
  return { investidor, cdiAtual: cdi, posicoes, taxaMediaPonderadaAnual: tmp.anual, totais };
}
