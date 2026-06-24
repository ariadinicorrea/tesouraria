import { supabaseAdmin } from "@/lib/supabase/admin";

export type CautelaRow = {
  id: string; empresa_id: string; serie: string | null;
  codigo: number | null; valor: number; status: string; aporte_id: string | null;
};

export async function listarSecuritizadoras() {
  const { data } = await supabaseAdmin.from("empresas")
    .select("id, nome").eq("tipo", "securitizadora").eq("ativo", true).order("nome");
  return data ?? [];
}

export async function listarCautelas(empresaId?: string) {
  let q = supabaseAdmin.from("cautelas")
    .select("id, empresa_id, serie, codigo, valor, status, aporte_id")
    .order("codigo", { ascending: true });
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data } = await q;
  return (data ?? []) as CautelaRow[];
}

export async function proximoCodigo(empresaId: string): Promise<number> {
  const { data } = await supabaseAdmin.from("cautelas")
    .select("codigo").eq("empresa_id", empresaId)
    .order("codigo", { ascending: false }).limit(1).maybeSingle();
  return (data?.codigo ?? 0) + 1;
}

// ===== Etapa 3: relatórios =====
export type RelEstoque = { empresa: string; serie: string; dispQtd: number; dispValor: number; vendQtd: number; vendValor: number; totalQtd: number; totalValor: number };
export type RelPorAporte = { empresa: string; investidor: string; aporteCodigo: string; dataAporte: string; qtd: number; valor: number; codigos: string };
export type RelPorInvestidor = { investidor: string; empresa: string; qtd: number; valor: number };

export async function relatoriosCautelas() {
  const { data: cautelas } = await supabaseAdmin.from("cautelas")
    .select("id, empresa_id, serie, codigo, valor, status, aporte_id, empresas!inner(nome)")
    .order("codigo", { ascending: true });

  const aporteIds = Array.from(new Set((cautelas ?? []).filter((c: any) => c.aporte_id).map((c: any) => c.aporte_id)));
  let aportesMap: Record<string, { investidor: string; empresa: string; codigo: string; data: string }> = {};
  if (aporteIds.length > 0) {
    const { data: aportes } = await supabaseAdmin.from("aportes")
      .select("id, codigo, data_aporte, investidores!inner(nome_razao_social), empresas!inner(nome)")
      .in("id", aporteIds);
    for (const a of aportes ?? []) {
      const inv = Array.isArray((a as any).investidores) ? (a as any).investidores[0] : (a as any).investidores;
      const emp = Array.isArray((a as any).empresas) ? (a as any).empresas[0] : (a as any).empresas;
      aportesMap[(a as any).id] = { investidor: inv?.nome_razao_social ?? "—", empresa: emp?.nome ?? "—", codigo: (a as any).codigo || "—", data: (a as any).data_aporte || "" };
    }
  }

  const nomeEmpresa = (c: any) => { const e = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas; return e?.nome ?? "—"; };

  const estMap = new Map<string, RelEstoque>();
  for (const c of cautelas ?? []) {
    const emp = nomeEmpresa(c);
    const serie = c.serie || "(sem série)";
    const k = emp + "||" + serie;
    const r = estMap.get(k) ?? { empresa: emp, serie, dispQtd: 0, dispValor: 0, vendQtd: 0, vendValor: 0, totalQtd: 0, totalValor: 0 };
    const v = Number(c.valor);
    if (c.status === "vendida") { r.vendQtd++; r.vendValor += v; } else { r.dispQtd++; r.dispValor += v; }
    r.totalQtd++; r.totalValor += v;
    estMap.set(k, r);
  }
  const estoque = Array.from(estMap.values()).sort((a, b) => a.empresa.localeCompare(b.empresa) || a.serie.localeCompare(b.serie));

  const apMap = new Map<string, RelPorAporte & { _codigos: number[] }>();
  for (const c of cautelas ?? []) {
    if (c.status !== "vendida" || !c.aporte_id) continue;
    const info = aportesMap[c.aporte_id];
    if (!info) continue;
    const r = apMap.get(c.aporte_id) ?? { empresa: info.empresa, investidor: info.investidor, aporteCodigo: info.codigo, dataAporte: info.data, qtd: 0, valor: 0, codigos: "", _codigos: [] };
    r.qtd++; r.valor += Number(c.valor); if (c.codigo != null) r._codigos.push(c.codigo);
    apMap.set(c.aporte_id, r);
  }
  const porAporte = Array.from(apMap.values()).map((r) => ({ ...r, codigos: r._codigos.sort((a, b) => a - b).join(", ") }))
    .sort((a, b) => a.investidor.localeCompare(b.investidor));

  const invMap = new Map<string, RelPorInvestidor>();
  for (const c of cautelas ?? []) {
    if (c.status !== "vendida" || !c.aporte_id) continue;
    const info = aportesMap[c.aporte_id];
    if (!info) continue;
    const k = info.investidor + "||" + info.empresa;
    const r = invMap.get(k) ?? { investidor: info.investidor, empresa: info.empresa, qtd: 0, valor: 0 };
    r.qtd++; r.valor += Number(c.valor);
    invMap.set(k, r);
  }
  const porInvestidor = Array.from(invMap.values()).sort((a, b) => a.investidor.localeCompare(b.investidor) || a.empresa.localeCompare(b.empresa));

  return { estoque, porAporte, porInvestidor };
}

// ===== Etapa 3: relatórios =====
export type RelEstoque = { empresa: string; serie: string; dispQtd: number; dispValor: number; vendQtd: number; vendValor: number; totalQtd: number; totalValor: number };
export type RelPorAporte = { empresa: string; investidor: string; aporteCodigo: string; dataAporte: string; qtd: number; valor: number; codigos: string };
export type RelPorInvestidor = { investidor: string; empresa: string; qtd: number; valor: number };

export async function relatoriosCautelas() {
  const { data: cautelas } = await supabaseAdmin.from("cautelas")
    .select("id, empresa_id, serie, codigo, valor, status, aporte_id, empresas!inner(nome)")
    .order("codigo", { ascending: true });

  const aporteIds = Array.from(new Set((cautelas ?? []).filter((c: any) => c.aporte_id).map((c: any) => c.aporte_id)));
  let aportesMap: Record<string, { investidor: string; empresa: string; codigo: string; data: string }> = {};
  if (aporteIds.length > 0) {
    const { data: aportes } = await supabaseAdmin.from("aportes")
      .select("id, codigo, data_aporte, investidores!inner(nome_razao_social), empresas!inner(nome)")
      .in("id", aporteIds);
    for (const a of aportes ?? []) {
      const inv = Array.isArray((a as any).investidores) ? (a as any).investidores[0] : (a as any).investidores;
      const emp = Array.isArray((a as any).empresas) ? (a as any).empresas[0] : (a as any).empresas;
      aportesMap[(a as any).id] = { investidor: inv?.nome_razao_social ?? "—", empresa: emp?.nome ?? "—", codigo: (a as any).codigo || "—", data: (a as any).data_aporte || "" };
    }
  }

  const nomeEmpresa = (c: any) => { const e = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas; return e?.nome ?? "—"; };

  const estMap = new Map<string, RelEstoque>();
  for (const c of cautelas ?? []) {
    const emp = nomeEmpresa(c);
    const serie = c.serie || "(sem série)";
    const k = emp + "||" + serie;
    const r = estMap.get(k) ?? { empresa: emp, serie, dispQtd: 0, dispValor: 0, vendQtd: 0, vendValor: 0, totalQtd: 0, totalValor: 0 };
    const v = Number(c.valor);
    if (c.status === "vendida") { r.vendQtd++; r.vendValor += v; } else { r.dispQtd++; r.dispValor += v; }
    r.totalQtd++; r.totalValor += v;
    estMap.set(k, r);
  }
  const estoque = Array.from(estMap.values()).sort((a, b) => a.empresa.localeCompare(b.empresa) || a.serie.localeCompare(b.serie));

  const apMap = new Map<string, RelPorAporte & { _codigos: number[] }>();
  for (const c of cautelas ?? []) {
    if (c.status !== "vendida" || !c.aporte_id) continue;
    const info = aportesMap[c.aporte_id];
    if (!info) continue;
    const r = apMap.get(c.aporte_id) ?? { empresa: info.empresa, investidor: info.investidor, aporteCodigo: info.codigo, dataAporte: info.data, qtd: 0, valor: 0, codigos: "", _codigos: [] };
    r.qtd++; r.valor += Number(c.valor); if (c.codigo != null) r._codigos.push(c.codigo);
    apMap.set(c.aporte_id, r);
  }
  const porAporte = Array.from(apMap.values()).map((r) => ({ ...r, codigos: r._codigos.sort((a, b) => a - b).join(", ") }))
    .sort((a, b) => a.investidor.localeCompare(b.investidor));

  const invMap = new Map<string, RelPorInvestidor>();
  for (const c of cautelas ?? []) {
    if (c.status !== "vendida" || !c.aporte_id) continue;
    const info = aportesMap[c.aporte_id];
    if (!info) continue;
    const k = info.investidor + "||" + info.empresa;
    const r = invMap.get(k) ?? { investidor: info.investidor, empresa: info.empresa, qtd: 0, valor: 0 };
    r.qtd++; r.valor += Number(c.valor);
    invMap.set(k, r);
  }
  const porInvestidor = Array.from(invMap.values()).sort((a, b) => a.investidor.localeCompare(b.investidor) || a.empresa.localeCompare(b.empresa));

  return { estoque, porAporte, porInvestidor };
}
