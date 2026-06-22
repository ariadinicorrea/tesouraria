import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  if (b.confirmar !== "APAGAR") return NextResponse.json({ ok: false, erro: 'Digite APAGAR para confirmar.' }, { status: 400 });
  const escopo = b.escopo === "aportes" ? "aportes" : "tudo";
  const tabelas = escopo === "aportes"
    ? ["comissoes", "resgates", "aportes"]
    : ["comissoes", "resgates", "aportes", "investidores"];
  const result: Record<string, { antes: number; depois: number; erro: string | null }> = {};
  for (const t of tabelas) {
    const { count: antes } = await supabaseAdmin.from(t).select("id", { count: "exact", head: true });
    const { error } = await supabaseAdmin.from(t).delete().not("id", "is", null);
    const { count: depois } = await supabaseAdmin.from(t).select("id", { count: "exact", head: true });
    result[t] = { antes: antes ?? 0, depois: depois ?? 0, erro: error?.message ?? null };
  }
  const tudoZerado = Object.values(result).every((r) => r.depois === 0);
  return NextResponse.json({ ok: true, escopo, result, tudoZerado });
}
