import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const de = u.searchParams.get("de"), ate = u.searchParams.get("ate"), agente = u.searchParams.get("agente");
  let q = supabaseAdmin.from("comissoes")
    .select("*, aportes(data_aporte, valor_aporte, investidores(nome_razao_social), empresas(nome)), agentes(nome)")
    .order("competencia", { ascending: false });
  if (de) q = q.gte("competencia", de);
  if (ate) q = q.lte("competencia", ate);
  if (agente) q = q.eq("agente_id", agente);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, comissoes: data });
}

export async function POST(req: Request) {
  const b = await req.json();
  const comp = String(b.competencia || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return NextResponse.json({ ok: false, erro: "Informe a competência (mês)." }, { status: 400 });
  const ini = `${comp}-01`;
  const [y, m] = comp.split("-").map(Number);
  const fim = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data: aportes } = await supabaseAdmin.from("aportes")
    .select("id, valor_aporte, comissao_percentual, agente_id, agentes(comissao_padrao)")
    .not("agente_id", "is", null).gte("data_aporte", ini).lte("data_aporte", fim);

  let geradas = 0;
  for (const a of (aportes ?? []) as any[]) {
    const ag = Array.isArray(a.agentes) ? a.agentes[0] : a.agentes;
    const pct = a.comissao_percentual != null ? Number(a.comissao_percentual) : Number(ag?.comissao_padrao ?? 0);
    const valor = Number(a.valor_aporte) * pct;
    const { error } = await supabaseAdmin.from("comissoes").insert({
      aporte_id: a.id, agente_id: a.agente_id, competencia: ini,
      base_valor: Number(a.valor_aporte), percentual: pct, valor, status: "pendente",
    });
    if (!error) geradas++;
  }
  return NextResponse.json({ ok: true, geradas });
}
