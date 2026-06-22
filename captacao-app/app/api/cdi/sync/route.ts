import { NextResponse } from "next/server";
import { fetchCdiAtual, fetchCdiIntervalo } from "@/lib/bcb";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/cdi/sync -> busca o CDI atual no BCB e grava em cdi_historico.
// Agende no Vercel Cron (dias úteis, após o fechamento da B3).
export async function POST() {
  try {
    const cdi = await fetchCdiAtual();
    const { error } = await supabaseAdmin
      .from("cdi_historico")
      .upsert(
        { data_referencia: cdi.dataReferencia, taxa_anual: cdi.taxaAnual },
        { onConflict: "data_referencia" }
      );
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      dataReferencia: cdi.dataReferencia,
      taxaAnual: cdi.taxaAnual,
      percentual: (cdi.taxaAnual * 100).toFixed(2) + "% a.a.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 502 });
  }
}

// GET /api/cdi/sync?de=01/01/2024&ate=31/12/2024 -> backfill do histórico
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  if (!de || !ate) {
    return NextResponse.json(
      { ok: false, erro: "Informe ?de=dd/MM/aaaa&ate=dd/MM/aaaa" },
      { status: 400 }
    );
  }
  try {
    const serie = await fetchCdiIntervalo(de, ate);
    const linhas = serie.map((p) => ({
      data_referencia: p.dataReferencia,
      taxa_anual: p.taxaAnual,
    }));
    const { error } = await supabaseAdmin
      .from("cdi_historico")
      .upsert(linhas, { onConflict: "data_referencia" });
    if (error) throw error;
    return NextResponse.json({ ok: true, registros: linhas.length });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 502 });
  }
}
