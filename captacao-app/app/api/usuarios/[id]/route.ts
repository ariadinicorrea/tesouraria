import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { papelAtual } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const p = await papelAtual();
  if (!p || p.papel !== "admin") return NextResponse.json({ ok: false, erro: "Acesso restrito." }, { status: 403 });
  const b = await req.json();
  const papel = ["admin", "gestor", "operador", "leitura"].includes(b.papel) ? b.papel : "leitura";
  if (params.id === p.userId && papel !== "admin") return NextResponse.json({ ok: false, erro: "Você não pode remover seu próprio acesso de administrador." }, { status: 400 });
  const { error } = await supabaseAdmin.from("perfis").update({ papel }).eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const p = await papelAtual();
  if (!p || p.papel !== "admin") return NextResponse.json({ ok: false, erro: "Acesso restrito." }, { status: 403 });
  if (params.id === p.userId) return NextResponse.json({ ok: false, erro: "Você não pode excluir o seu próprio usuário." }, { status: 400 });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
