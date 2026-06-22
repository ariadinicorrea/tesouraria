import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json();
  if (b.logo_data_url && b.logo_data_url.length > 1_500_000)
    return NextResponse.json({ ok: false, erro: "Logo muito grande. Use uma imagem menor (até ~1MB)." }, { status: 400 });
  const { error } = await supabaseAdmin.from("configuracoes")
    .upsert({ id: "singleton", logo_data_url: b.logo_data_url ?? null, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
