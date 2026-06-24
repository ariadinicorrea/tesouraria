import { supabaseAdmin } from "@/lib/supabase/admin";
import { taxaEfetivaAnual, saldoBrutoHistorico, contarDiasUteis, type ParametrosRemuneracao } from "@/lib/funding-engine";

export type CotaRow = {
  id: string; empresa_id: string; serie: string; valor_inicial: number;
  data_inicio: string | null; tipo_remuneracao: string; taxa_valor: number | null;
  periodo_taxa: string | null; percentual_cdi: number | null; ativo: boolean;
};
export type CotaComValor = CotaRow & { valorAtual: number; taxaEfAnual: number; rendimentoPct: number; iniciada: boolean };

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

export async function listarFundos() {
  const { data } = await supabaseAdmin.from("empresas").select("id, nome").eq("tipo", "fidc").eq("ativo", true).order("nome");
  return data ?? [];
}

export function valorCotaHoje(c: CotaRow, cdi: number, serie: any[], selic: number, selicS: any[]) {
  const params: ParametrosRemuneracao = {
    tipo: c.tipo_remuneracao as any, taxaValor: c.taxa_valor ?? undefined,
    periodo: (c.periodo_taxa as any) ?? undefined, percentualCdi: c.percentual_cdi ?? undefined,
  };
  const ehSelic = c.tipo_remuneracao === "selic_mais";
  const semSelic = ehSelic && selicS.length === 0;
  const idx = ehSelic && !semSelic ? selic : cdi;
  const serieIdx = ehSelic && !semSelic ? selicS : serie;
  const taxaEf = taxaEfetivaAnual(params, idx);
  if (!c.data_inicio) {
    return { valorAtual: Number(c.valor_inicial), taxaEfAnual: taxaEf, rendimentoPct: 0, iniciada: false };
  }
  const dias = contarDiasUteis(new Date(c.data_inicio), new Date());
  const valorAtual = saldoBrutoHistorico(Number(c.valor_inicial), params, String(c.data_inicio).slice(0, 10), serieIdx, idx, dias);
  const rendimentoPct = Number(c.valor_inicial) > 0 ? (valorAtual / Number(c.valor_inicial) - 1) : 0;
  return { valorAtual, taxaEfAnual: taxaEf, rendimentoPct, iniciada: true };
}

export async function listarCotasComValor(empresaId?: string): Promise<CotaComValor[]> {
  let q = supabaseAdmin.from("cotas").select("*").eq("ativo", true).order("serie");
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data } = await q;
  const cotas = (data ?? []) as CotaRow[];
  if (cotas.length === 0) return [];
  const [cdi, serie, selic, selicS] = await Promise.all([cdiVigente(), cdiSerie(), selicVigente(), selicSerie()]);
  return cotas.map((c) => ({ ...c, ...valorCotaHoje(c, cdi, serie, selic, selicS) }));
}
