import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const b = await req.json();
  const empresa_id = b.empresa_id;
  const serie = (b.serie ?? "").trim();
  const valor = Number(String(b.valor ?? "").replace(",", ".")) || 0;
  const quantidade = parseInt(String(b.quantidade ?? ""), 10) || 0;
  const inicio = parseInt(String(b.codigo_inicial ?? ""), 10) || 0;

  if (!empresa_id) return NextResponse.json({ ok: false, erro: "Selecione a empresa." }, { status: 400 });
  if (!serie) return NextResponse.json({ ok: false, erro: "Informe a série/emissão." }, { status: 400 });
  if (valor <= 0) return NextResponse.json({ ok: false, erro: "Valor deve ser maior que zero." }, { status: 400 });
  if (quantidade <= 0 || quantidade > 5000) return NextResponse.json({ ok: false, erro: "Quantidade inválida (1 a 5000)." }, { status: 400 });
  if (inicio <= 0) return NextResponse.json({ ok: false, erro: "Código inicial inválido." }, { status: 400 });

  const linhas = [];
  for (let i = 0; i < quantidade; i++) {
    linhas.push({ empresa_id, serie, codigo: inicio + i, valor, status: "disponivel" });
  }

  const { error, data } = await supabaseAdmin.from("cautelas").insert(linhas).select("id");
  if (error) {
    if (error.message.includes("uq_cautela_codigo") || error.message.includes("duplicate"))
      return NextResponse.json({ ok: false, erro: "Já existem cautelas com esses códigos nessa empresa. Ajuste o código inicial." }, { status: 400 });
    return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, criadas: data?.length ?? 0 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : (id ? [id] : []);
  if (ids.length === 0) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  const { data: cs } = await supabaseAdmin.from("cautelas").select("id, status").in("id", ids);
  const excluiveis = (cs ?? []).filter((c) => c.status !== "vendida").map((c) => c.id);
  const bloqueadas = (cs ?? []).length - excluiveis.length;
  if (excluiveis.length === 0) return NextResponse.json({ ok: false, erro: "Nenhuma cautela disponível para excluir (vendidas não podem)." }, { status: 400 });
  const { error } = await supabaseAdmin.from("cautelas").delete().in("id", excluiveis);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, excluidas: excluiveis.length, ignoradas: bloqueadas });
}


export async function PATCH(req: Request) {
  const b = await req.json();
  const id = b.id;
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  const { data: c } = await supabaseAdmin.from("cautelas").select("status").eq("id", id).maybeSingle();
  if (!c) return NextResponse.json({ ok: false, erro: "Cautela não encontrada." }, { status: 404 });
  if (c.status === "vendida") return NextResponse.json({ ok: false, erro: "Cautela vendida não pode ser editada." }, { status: 400 });
  const upd = {};
  if (b.serie !== undefined) upd.serie = String(b.serie).trim();
  if (b.valor !== undefined) {
    const v = Number(String(b.valor).replace(",", ".")) || 0;
    if (v <= 0) return NextResponse.json({ ok: false, erro: "Valor deve ser maior que zero." }, { status: 400 });
    upd.valor = v;
  }
  const { error } = await supabaseAdmin.from("cautelas").update(upd).eq("id", id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
