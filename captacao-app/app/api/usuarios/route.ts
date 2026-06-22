import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { papelAtual } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = await papelAtual();
  if (!p) return NextResponse.json({ ok: false, erro: "Sessão não encontrada. Saia e entre de novo." }, { status: 401 });
  if (p.papel !== "admin") return NextResponse.json({ ok: false, erro: `Seu usuário aparece como "${p.papel}", não como administrador.` }, { status: 403 });
  const { data } = await supabaseAdmin.from("perfis").select("id, nome, email, papel, created_at").order("created_at");
  return NextResponse.json({ ok: true, usuarios: data });
}

export async function POST(req: Request) {
  const p = await papelAtual();
  if (!p) return NextResponse.json({ ok: false, erro: "Sessão não encontrada. Saia e entre de novo." }, { status: 401 });
  if (p.papel !== "admin") return NextResponse.json({ ok: false, erro: `Seu usuário aparece como "${p.papel}", não como administrador. Peça para um admin ajustar seu papel.` }, { status: 403 });

  const b = await req.json();
  const email = String(b.email || "").trim();
  const senha = String(b.senha || "");
  if (!email) return NextResponse.json({ ok: false, erro: "Informe o e-mail." }, { status: 400 });
  if (senha.length < 6) return NextResponse.json({ ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  const papel = ["admin", "gestor", "operador", "leitura"].includes(b.papel) ? b.papel : "leitura";

  const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !u?.user) {
    const m = (error?.message || "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists"))
      return NextResponse.json({ ok: false, erro: "Já existe um usuário com esse e-mail." }, { status: 400 });
    return NextResponse.json({ ok: false, erro: "Erro ao criar no Supabase: " + (error?.message || "desconhecido") }, { status: 400 });
  }
  const { error: e2 } = await supabaseAdmin.from("perfis").insert({ id: u.user.id, nome: b.nome || null, email, papel });
  if (e2) {
    await supabaseAdmin.auth.admin.deleteUser(u.user.id).catch(() => {});
    return NextResponse.json({ ok: false, erro: "Erro ao salvar o perfil: " + e2.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
