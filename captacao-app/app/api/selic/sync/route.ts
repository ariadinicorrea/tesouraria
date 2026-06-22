import { NextResponse } from "next/server";
import { fetchSelicIntervalo } from "@/lib/bcb";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

// GET /api/selic/sync?de=dd/MM/aaaa&ate=dd/MM/aaaa -> backfill do histórico da Selic
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  if (!de || !ate) return NextResponse.json({ ok: false, erro: "Informe ?de=dd/MM/aaaa&ate=dd/MM/aaaa" }, { status: 400 });
  try {
    const serie = await fetchSelicIntervalo(de, ate);
    const linhas = serie.map((p) => ({ data_referencia: p.dataReferencia, taxa_anual: p.taxaAnual }));
    const { error } = await supabaseAdmin.from("selic_historico").upsert(linhas, { onConflict: "data_referencia" });
    if (error) throw error;
    return NextResponse.json({ ok: true, registros: linhas.length });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 502 });
  }
}
