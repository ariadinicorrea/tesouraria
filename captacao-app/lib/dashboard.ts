import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  taxaEfetivaAnual, saldoBrutoAtualizado, saldoBrutoHistorico, contarDiasUteis,
  taxaMediaPonderada, custoCaptacaoCarteira, custoCaptacao,
  anualParaMensal, anualParaDiario, type ParametrosRemuneracao,
} from "@/lib/funding-engine";

export interface EmpresaResumo {
  empresaId: string; nome: string; tipo: string;
  saldoBruto: number; taxaMediaAnual: number; qtdAportes: number;
  custoAnual: number; custoMensal: number; custoDiario: number;
}
export interface DashboardData {
  escopo: string; cdiAtual: number; cdiData: string | null;
  totalCaptado: number; totalAportado: number; numInvestidores: number;
  taxaMedia: { anual: number; mensal: number; diaria: number };
  custo: { diario: number; mensal: number; anual: number };
  porEmpresa: EmpresaResumo[];
  vencimentosProximos: { investidor: string; empresa: string; valor: number; vencimento: string }[];
}

async function cdiVigente() {
  const { data } = await supabaseAdmin.from("cdi_historico")
    .select("data_referencia, taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  return { taxa: data ? Number(data.taxa_anual) : 0, data: data?.data_referencia ?? null };
}
async function cdiSerie(): Promise<{ data: string; taxa: number }[]> {
  const { data } = await supabaseAdmin.from("cdi_historico").select("data_referencia, taxa_anual").order("data_referencia", { ascending: true }).limit(5000);
  return (data ?? []).map((r: any) => ({ data: String(r.data_referencia).slice(0, 10), taxa: Number(r.taxa_anual) }));
}
async function selicVigente(): Promise<number> {
  const { data } = await supabaseAdmin.from("selic_historico").select("taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.taxa_anual) : 0;
}
async function selicSerie(): Promise<{ data: string; taxa: number }[]> {
  const { data } = await supabaseAdmin.from("selic_historico").select("data_referencia, taxa_anual").order("data_referencia", { ascending: true }).limit(5000);
  return (data ?? []).map((r: any) => ({ data: String(r.data_referencia).slice(0, 10), taxa: Number(r.taxa_anual) }));
}
async function valoresCotaAtuais(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from("cotas_valor_historico")
    .select("empresa_id, valor_cota, data_referencia").order("data_referencia", { ascending: false });
  const m: Record<string, number> = {};
  for (const r of data ?? []) if (!(r.empresa_id in m)) m[r.empresa_id] = Number(r.valor_cota);
  return m;
}
async function resgatadoPorAporte(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from("resgates").select("aporte_id, valor_bruto, status").eq("status", "efetuado");
  const m: Record<string, number> = {};
  for (const r of data ?? []) m[r.aporte_id] = (m[r.aporte_id] ?? 0) + Number(r.valor_bruto);
  return m;
}

export async function computeDashboard(escopo: string = "consolidado"): Promise<DashboardData> {
  const { taxa: cdi, data: cdiData } = await cdiVigente();
  const serie = await cdiSerie();
  const selic = await selicVigente();
  const selicS = await selicSerie();
  const cotas = await valoresCotaAtuais();
  const resgatado = await resgatadoPorAporte();

  let query = supabaseAdmin.from("aportes").select(
    `id, valor_aporte, data_aporte, data_vencimento, tipo_remuneracao, taxa_valor, periodo_taxa,
     percentual_cdi, quantidade_cotas, empresa_id, investidor_id,
     empresas!inner(nome, tipo), investidores!inner(nome_razao_social),
     instrumentos_financeiros!inner(baseado_em_cotas)`
  ).eq("status", "ativo");
  if (escopo !== "consolidado") query = query.eq("empresa_id", escopo);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as any[];

  const hoje = new Date();
  const porEmpresaMap = new Map<string, { nome: string; tipo: string; pos: { saldoBruto: number; taxaEfetivaAnual: number }[] }>();
  const investidores = new Set<string>();
  let totalAportadoAcc = 0;
  const vencimentos: DashboardData["vencimentosProximos"] = [];

  for (const r of rows) {
    investidores.add(r.investidor_id);
    totalAportadoAcc += Number(r.valor_aporte);
    const params: ParametrosRemuneracao = {
      tipo: r.tipo_remuneracao, taxaValor: r.taxa_valor ?? undefined,
      periodo: r.periodo_taxa ?? undefined, percentualCdi: r.percentual_cdi ?? undefined,
    };
    const ehSelic = r.tipo_remuneracao === "selic_mais";
    const semSelic = ehSelic && selicS.length === 0;
    const idx = ehSelic && !semSelic ? selic : cdi;
    const serieIdx = ehSelic && !semSelic ? selicS : serie;
    const taxaEf = taxaEfetivaAnual(params, idx);
    const dias = contarDiasUteis(new Date(r.data_aporte), hoje);
    let saldoBruto = saldoBrutoHistorico(r.valor_aporte, params, String(r.data_aporte).slice(0, 10), serieIdx, idx, dias);
    saldoBruto -= resgatado[r.id] ?? 0;
    if (saldoBruto < 0) saldoBruto = 0;

    if (!porEmpresaMap.has(r.empresa_id)) porEmpresaMap.set(r.empresa_id, { nome: r.empresas.nome, tipo: r.empresas.tipo, pos: [] });
    porEmpresaMap.get(r.empresa_id)!.pos.push({ saldoBruto, taxaEfetivaAnual: taxaEf });

    if (r.data_vencimento) {
      const diff = (new Date(r.data_vencimento).getTime() - hoje.getTime()) / 86400000;
      if (diff >= 0 && diff <= 30)
        vencimentos.push({ investidor: r.investidores.nome_razao_social, empresa: r.empresas.nome, valor: saldoBruto, vencimento: r.data_vencimento });
    }
  }

  const porEmpresa: EmpresaResumo[] = [];
  const todas: { saldoBruto: number; taxaEfetivaAnual: number }[] = [];
  for (const [id, e] of porEmpresaMap) {
    const tm = taxaMediaPonderada(e.pos);
    const c = custoCaptacaoCarteira(e.pos);
    porEmpresa.push({ empresaId: id, nome: e.nome, tipo: e.tipo, saldoBruto: tm.saldoTotal, taxaMediaAnual: tm.anual, qtdAportes: e.pos.length, custoAnual: c.anual, custoMensal: c.mensal, custoDiario: c.diario });
    todas.push(...e.pos);
  }
  porEmpresa.sort((a, b) => b.saldoBruto - a.saldoBruto);

  const tm = taxaMediaPonderada(todas);
  const custo = custoCaptacaoCarteira(todas);
  vencimentos.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return {
    escopo, cdiAtual: cdi, cdiData,
    totalCaptado: tm.saldoTotal, totalAportado: totalAportadoAcc, numInvestidores: investidores.size,
    taxaMedia: { anual: tm.anual, mensal: tm.mensal, diaria: tm.diaria },
    custo, porEmpresa, vencimentosProximos: vencimentos.slice(0, 8),
  };
}
