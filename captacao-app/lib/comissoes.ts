import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ItemComissao { aporteId: string; investidor: string; empresa: string; dataAporte: string; valorAporte: number; pct: number; comissao: number; }
export interface AgenteComissao { agenteId: string; agente: string; total: number; itens: ItemComissao[]; }

export async function computeComissoes(opts: { agenteId?: string; de?: string; ate?: string } = {}): Promise<{ porAgente: AgenteComissao[]; totalGeral: number }> {
  let q = supabaseAdmin.from("aportes")
    .select(`id, valor_aporte, data_aporte, comissao_percentual, agente_id,
      empresas(nome), investidores(nome_razao_social), agentes!inner(nome, comissao_padrao)`)
    .not("agente_id", "is", null);
  if (opts.agenteId) q = q.eq("agente_id", opts.agenteId);
  if (opts.de) q = q.gte("data_aporte", opts.de);
  if (opts.ate) q = q.lte("data_aporte", opts.ate);
  const { data } = await q.order("data_aporte", { ascending: false });

  const mapa = new Map<string, AgenteComissao>();
  let totalGeral = 0;
  for (const a of (data ?? []) as any[]) {
    const pct = a.comissao_percentual != null ? Number(a.comissao_percentual) : Number(a.agentes?.comissao_padrao ?? 0);
    const comissao = Number(a.valor_aporte) * pct; totalGeral += comissao;
    if (!mapa.has(a.agente_id)) mapa.set(a.agente_id, { agenteId: a.agente_id, agente: a.agentes?.nome ?? "—", total: 0, itens: [] });
    const g = mapa.get(a.agente_id)!; g.total += comissao;
    g.itens.push({ aporteId: a.id, investidor: a.investidores?.nome_razao_social, empresa: a.empresas?.nome, dataAporte: a.data_aporte, valorAporte: Number(a.valor_aporte), pct, comissao });
  }
  return { porAgente: Array.from(mapa.values()).sort((x, y) => y.total - x.total), totalGeral };
}
