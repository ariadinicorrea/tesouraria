import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ItemTributo { data: string; empresa: string; tipo: string; valorBruto: number; iof: number; ir: number; aliquotaIr: number; }
export interface InvestidorTributo { investidor: string; documento: string; totalIr: number; totalIof: number; itens: ItemTributo[]; }

export async function computeTributos(opts: { de?: string; ate?: string; investidorId?: string } = {}): Promise<{ porInvestidor: InvestidorTributo[]; totalIr: number; totalIof: number }> {
  const anoAnterior = new Date().getFullYear() - 1;
  const de = opts.de || `${anoAnterior}-01-01`;
  const ate = opts.ate || `${anoAnterior}-12-31`;

  let q = supabaseAdmin.from("resgates")
    .select(`data_resgate, valor_bruto, ir_retido, iof_retido, aliquota_ir, status,
      aportes!inner(investidor_id, empresas(nome), investidores(nome_razao_social, documento))`)
    .eq("status", "efetuado").gte("data_resgate", de).lte("data_resgate", ate);
  if (opts.investidorId) q = q.eq("aportes.investidor_id", opts.investidorId);
  const { data } = await q.order("data_resgate", { ascending: true });

  const mapa = new Map<string, InvestidorTributo>();
  let totalIr = 0, totalIof = 0;
  for (const r of (data ?? []) as any[]) {
    const inv = Array.isArray(r.aportes?.investidores) ? r.aportes.investidores[0] : r.aportes?.investidores;
    const empNome = (Array.isArray(r.aportes?.empresas) ? r.aportes.empresas[0] : r.aportes?.empresas)?.nome ?? "—";
    const chave = inv?.documento ?? inv?.nome_razao_social ?? "—";
    const ir = Number(r.ir_retido), iof = Number(r.iof_retido ?? 0);
    totalIr += ir; totalIof += iof;
    if (!mapa.has(chave)) mapa.set(chave, { investidor: inv?.nome_razao_social ?? "—", documento: inv?.documento ?? "—", totalIr: 0, totalIof: 0, itens: [] });
    const g = mapa.get(chave)!; g.totalIr += ir; g.totalIof += iof;
    g.itens.push({ data: r.data_resgate, empresa: empNome, tipo: "Resgate", valorBruto: Number(r.valor_bruto), iof, ir, aliquotaIr: Number(r.aliquota_ir) });
  }
  return { porInvestidor: Array.from(mapa.values()).sort((x, y) => y.totalIr - x.totalIr), totalIr, totalIof };
}
