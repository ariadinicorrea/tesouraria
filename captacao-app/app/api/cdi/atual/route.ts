import { NextResponse } from "next/server";
import { fetchCdiAtual } from "@/lib/bcb";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/cdi/atual -> CDI vigente para cálculo (lê do banco; se vazio, BCB).
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("cdi_historico")
      .select("data_referencia, taxa_anual")
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (data) {
      return NextResponse.json({
        ok: true,
        origem: "banco",
        dataReferencia: data.data_referencia,
        taxaAnual: Number(data.taxa_anual),
      });
    }

    const cdi = await fetchCdiAtual();
    await supabaseAdmin
      .from("cdi_historico")
      .upsert(
        { data_referencia: cdi.dataReferencia, taxa_anual: cdi.taxaAnual },
        { onConflict: "data_referencia" }
      );
    return NextResponse.json({
      ok: true,
      origem: "bcb",
      dataReferencia: cdi.dataReferencia,
      taxaAnual: cdi.taxaAnual,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 502 });
  }
}
