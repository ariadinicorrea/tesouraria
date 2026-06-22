import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CautelaInfo {
  id: string; empresaId: string; empresa: string; empresaTipo: string; serie: string;
  quantidadeEmitida: number; valorUnitario: number; vencimento: string | null;
  vendida: number; disponivel: number; valorVendido: number; diasParaVencer: number | null;
}

export async function computeCautelas(): Promise<CautelaInfo[]> {
  const { data: cautelas } = await supabaseAdmin.from("cautelas")
    .select("*, empresas(nome, tipo)").eq("ativo", true).order("vencimento", { ascending: true });
  const { data: aportes } = await supabaseAdmin.from("aportes")
    .select("cautela_id, valor_aporte, quantidade_cotas, status").eq("status", "ativo").not("cautela_id", "is", null);

  const out: CautelaInfo[] = [];
  for (const c of (cautelas ?? []) as any[]) {
    const emp = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const tipo = emp?.tipo ?? "";
    const unit = Number(c.valor_unitario) || 0;
    let vendida = 0;
    for (const a of (aportes ?? []) as any[]) {
      if (a.cautela_id !== c.id) continue;
      if (tipo === "fidc" && a.quantidade_cotas) vendida += Number(a.quantidade_cotas);
      else if (unit > 0) vendida += Number(a.valor_aporte) / unit;
    }
    const emitida = Number(c.quantidade_emitida);
    const dias = c.vencimento ? Math.ceil((new Date(c.vencimento).getTime() - Date.now()) / 86400000) : null;
    out.push({
      id: c.id, empresaId: c.empresa_id, empresa: emp?.nome ?? "—", empresaTipo: tipo, serie: c.serie,
      quantidadeEmitida: emitida, valorUnitario: unit, vencimento: c.vencimento,
      vendida, disponivel: emitida - vendida, valorVendido: vendida * unit, diasParaVencer: dias,
    });
  }
  return out;
}
