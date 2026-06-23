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
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  const { data: c } = await supabaseAdmin.from("cautelas").select("status").eq("id", id).maybeSingle();
  if (c?.status === "vendida") return NextResponse.json({ ok: false, erro: "Cautela vendida não pode ser excluída." }, { status: 400 });
  const { error } = await supabaseAdmin.from("cautelas").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
