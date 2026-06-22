import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.email || !b.senha) return NextResponse.json({ ok: false, erro: "Informe e-mail e senha." }, { status: 400 });
  const { count } = await supabaseAdmin.from("perfis").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ ok: false, erro: "Já existe usuário. Peça a um administrador para criar o seu acesso." }, { status: 403 });

  const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: b.email, password: b.senha, email_confirm: true });
  if (error || !u.user) return NextResponse.json({ ok: false, erro: error?.message || "Falha ao criar usuário." }, { status: 400 });
  const { error: e2 } = await supabaseAdmin.from("perfis").insert({ id: u.user.id, nome: b.nome || null, email: b.email, papel: "admin" });
  if (e2) return NextResponse.json({ ok: false, erro: e2.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
