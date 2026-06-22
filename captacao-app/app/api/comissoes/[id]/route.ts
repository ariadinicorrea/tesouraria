import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const pago = b.status === "pago";
  const { error } = await supabaseAdmin.from("comissoes")
    .update({ status: pago ? "pago" : "pendente", pago_em: pago ? new Date().toISOString() : null }).eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
