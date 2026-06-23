import { NextResponse } from "next/server";
import { fetchCdiIntervalo, fetchSelicIntervalo } from "@/lib/bcb";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function brDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

async function atualizar() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 12);
  const de = brDate(inicio);
  const ate = brDate(hoje);
  const r: any = { ok: true, periodo: { de, ate }, cdi: 0, selic: 0 };
  try {
    const cdi = await fetchCdiIntervalo(de, ate);
    if (cdi.length) {
      const linhas = cdi.map((p) => ({ data_referencia: p.dataReferencia, taxa_anual: p.taxaAnual }));
      const { error } = await supabaseAdmin.from("cdi_historico").upsert(linhas, { onConflict: "data_referencia" });
      if (error) throw error;
      r.cdi = linhas.length;
    }
  } catch (e) { r.cdiErro = (e as Error).message; }
  try {
    const selic = await fetchSelicIntervalo(de, ate);
    if (selic.length) {
      const linhas = selic.map((p) => ({ data_referencia: p.dataReferencia, taxa_anual: p.taxaAnual }));
      const { error } = await supabaseAdmin.from("selic_historico").upsert(linhas, { onConflict: "data_referencia" });
      if (error) throw error;
      r.selic = linhas.length;
    }
  } catch (e) { r.selicErro = (e as Error).message; }
  return r;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, erro: "nao autorizado" }, { status: 401 });
  }
  return NextResponse.json(await atualizar());
}
