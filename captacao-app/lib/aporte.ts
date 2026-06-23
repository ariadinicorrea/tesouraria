import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  taxaEfetivaAnual, saldoBrutoAtualizado, saldoBrutoHistorico, contarDiasUteis,
  type ParametrosRemuneracao, type RegimeTributario,
} from "@/lib/funding-engine";

export interface AporteAtual {
  aporteId: string; investidorId: string; empresaId: string; empresa: string; investidor: string;
  valorAportado: number; dataAporte: string; saldoBruto: number;
  rendimento: number; regime: RegimeTributario; diasCorridos: number; taxaEf: number; remuneracao: string; codigo: string | null;
}

async function cdiVigente(): Promise<number> {
  const { data } = await supabaseAdmin.from("cdi_historico").select("taxa_anual").order("data_referencia", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.taxa_anual) : 0;
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

async function calcular(a: any, cdi: number, serie: { data: string; taxa: number }[], selic: number, selicSerieArr: { data: string; taxa: number }[], resgatesMap?: Map<string, { bruto: number; principal: number }>): Promise<AporteAtual> {
  const emp = Array.isArray(a.empresas) ? a.empresas[0] : a.empresas;
  const instr = Array.isArray(a.instrumentos_financeiros) ? a.instrumentos_financeiros[0] : a.instrumentos_financeiros;
  const inv = Array.isArray(a.investidores) ? a.investidores[0] : a.investidores;
  const params: ParametrosRemuneracao = {
    tipo: a.tipo_remuneracao, taxaValor: a.taxa_valor ?? undefined,
    periodo: a.periodo_taxa ?? undefined, percentualCdi: a.percentual_cdi ?? undefined,
  };
  const ehSelic = a.tipo_remuneracao === "selic_mais";
  const semSelic = ehSelic && selicSerieArr.length === 0;       // Selic ainda não carregada -> usa CDI como proxy
  const idx = ehSelic && !semSelic ? selic : cdi;
  const serieIdx = ehSelic && !semSelic ? selicSerieArr : serie;
  const taxaEf = taxaEfetivaAnual(params, idx);
  const dataAporte = new Date(a.data_aporte);
  const hoje = new Date();
  const diasUteis = contarDiasUteis(dataAporte, hoje);
  const diasCorridos = Math.floor((hoje.getTime() - dataAporte.getTime()) / 86400000);
  let saldoBruto = saldoBrutoHistorico(a.valor_aporte, params, String(a.data_aporte).slice(0, 10), serieIdx, idx, diasUteis);
  let rendimento = saldoBruto - a.valor_aporte;
  const res = resgatesMap ? (resgatesMap.get(a.id) ?? { bruto: 0, principal: 0 }) : await resgatesEfetuados(a.id);
  const principalVigente = a.valor_aporte - res.principal;
  saldoBruto -= res.bruto; if (saldoBruto < 0) saldoBruto = 0;
  rendimento = saldoBruto - principalVigente; if (rendimento < 0) rendimento = 0;
  const regime: RegimeTributario =
    instr?.isento_ir || emp?.tipo === "contratos" ? "isento" : (emp?.regime_tributario as RegimeTributario);
  let remuneracao: string;
  if (a.tipo_remuneracao === "percentual_cdi") {
    remuneracao = `${((Number(a.percentual_cdi) || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% CDI`;
  } else if (a.tipo_remuneracao === "cdi_mais") {
    remuneracao = `CDI + ${((Number(a.taxa_valor) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  } else if (a.tipo_remuneracao === "selic_mais") {
    remuneracao = `Selic + ${((Number(a.taxa_valor) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  } else {
    remuneracao = `${((Number(a.taxa_valor) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% ${a.periodo_taxa === "mensal" ? "a.m." : "a.a."} (fixa)`;
  }
  return {
    aporteId: a.id, investidorId: a.investidor_id, empresaId: a.empresa_id, empresa: emp?.nome, investidor: inv?.nome_razao_social,
    valorAportado: a.valor_aporte, dataAporte: a.data_aporte, saldoBruto, rendimento, regime, diasCorridos, taxaEf, remuneracao, codigo: a.codigo ?? null,
  };
}

export async function computeAportesAtivos(): Promise<AporteAtual[]> {
  const [cdi, serie, selic, selicS] = await Promise.all([cdiVigente(), cdiSerie(), selicVigente(), selicSerie()]);
  const { data } = await supabaseAdmin.from("aportes")
    .select(`*, empresas!inner(nome, tipo, regime_tributario), investidores!inner(nome_razao_social), instrumentos_financeiros!inner(baseado_em_cotas, isento_ir)`)
    .eq("status", "ativo").order("created_at", { ascending: false });
  const { data: resg } = await supabaseAdmin.from("resgates")
    .select("aporte_id, valor_bruto, base_calculo_ir").eq("status", "efetuado");
  const resgatesMap = new Map<string, { bruto: number; principal: number }>();
  for (const r of resg ?? []) {
    const cur = resgatesMap.get(r.aporte_id) ?? { bruto: 0, principal: 0 };
    const vb = Number(r.valor_bruto);
    cur.bruto += vb; cur.principal += vb - Number(r.base_calculo_ir);
    resgatesMap.set(r.aporte_id, cur);
  }
  const out: AporteAtual[] = [];
  for (const a of data ?? []) out.push(await calcular(a, cdi, serie, selic, selicS, resgatesMap));
  return out;
}

export async function computeAporteAtual(aporteId: string): Promise<AporteAtual | null> {
  const cdi = await cdiVigente();
  const serie = await cdiSerie();
  const selic = await selicVigente();
  const selicS = await selicSerie();
  const { data } = await supabaseAdmin.from("aportes")
    .select(`*, empresas!inner(nome, tipo, regime_tributario), investidores!inner(nome_razao_social), instrumentos_financeiros!inner(baseado_em_cotas, isento_ir)`)
    .eq("id", aporteId).maybeSingle();
  if (!data) return null;
  return calcular(data, cdi, serie, selic, selicS);
}

export interface Movimento { data: string; descricao: string; entrada: number; saida: number; saldo: number; }
export interface ContaCorrente {
  aporte: any; investidor: string; empresa: string; instrumento: string;
  agente: string | null; comissaoValor: number; comissaoPct: number;
  movimentos: Movimento[]; saldoCaixa: number; posicao: AporteAtual | null;
}

export async function computeContaCorrente(aporteId: string): Promise<ContaCorrente | null> {
  const { data: a } = await supabaseAdmin.from("aportes")
    .select(`*, empresas(nome), investidores(nome_razao_social), instrumentos_financeiros(nome), agentes(nome, comissao_padrao)`)
    .eq("id", aporteId).maybeSingle();
  if (!a) return null;

  const { data: resgates } = await supabaseAdmin.from("resgates")
    .select("*").eq("aporte_id", aporteId).order("data_resgate", { ascending: true });

  const eventos: { data: string; descricao: string; entrada: number; saida: number }[] = [
    { data: a.data_aporte, descricao: "Aporte", entrada: Number(a.valor_aporte), saida: 0 },
  ];
  for (const r of resgates ?? []) {
    const rotulo = r.tipo_resgate === "total" ? "Resgate total" : r.tipo_resgate === "apenas_juros" ? "Resgate de juros" : "Resgate parcial";
    eventos.push({ data: r.data_resgate, descricao: `${rotulo} (IR ${fmtPctSimples(Number(r.aliquota_ir))})`, entrada: 0, saida: Number(r.valor_bruto) });
  }
  eventos.sort((x, y) => x.data.localeCompare(y.data));

  let saldo = 0;
  const movimentos: Movimento[] = eventos.map((e) => { saldo += e.entrada - e.saida; return { ...e, saldo }; });

  const comissaoPct = a.comissao_percentual != null ? Number(a.comissao_percentual) : Number(a.agentes?.comissao_padrao ?? 0);
  const comissaoValor = Number(a.valor_aporte) * comissaoPct;

  const posicao = await computeAporteAtual(aporteId);

  return {
    aporte: a, investidor: a.investidores?.nome_razao_social, empresa: a.empresas?.nome,
    instrumento: a.instrumentos_financeiros?.nome, agente: a.agentes?.nome ?? null,
    comissaoValor, comissaoPct, movimentos, saldoCaixa: saldo, posicao,
  };
}
function fmtPctSimples(f: number) { return `${(f * 100).toFixed(1)}%`; }

export async function computeResgateDetalhe(resgateId: string) {
  const { data: r } = await supabaseAdmin.from("resgates")
    .select(`*, aportes!inner(valor_aporte, empresas(nome), investidores(nome_razao_social, documento, email, telefone))`)
    .eq("id", resgateId).maybeSingle();
  if (!r) return null;
  const inv = (r as any).aportes?.investidores;
  return {
    resgate: r,
    empresa: (r as any).aportes?.empresas?.nome ?? "",
    investidor: inv?.nome_razao_social ?? "",
    documento: inv?.documento ?? "",
    email: inv?.email ?? "",
    telefone: inv?.telefone ?? "",
  };
}
