import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });

  const { data: r } = await supabaseAdmin.from("resgates").select("*").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ ok: false, erro: "Resgate não encontrado." }, { status: 404 });

  const { data: ap } = await supabaseAdmin.from("aportes")
    .select("id, status, quantidade_cotas, empresas!inner(tipo)")
    .eq("id", r.aporte_id).maybeSingle();
  const tipoEmpresa = ap ? (Array.isArray((ap as any).empresas) ? (ap as any).empresas[0]?.tipo : (ap as any).empresas?.tipo) : null;

  if (r.status === "efetuado") {
    if (tipoEmpresa === "securitizadora" && Array.isArray(r.cautelas_devolvidas) && r.cautelas_devolvidas.length > 0) {
      const ids = r.cautelas_devolvidas as string[];
      const { data: aindaLivres } = await supabaseAdmin.from("cautelas").select("id, status").in("id", ids);
      const revincular = (aindaLivres ?? []).filter((c: any) => c.status === "disponivel").map((c: any) => c.id);
      const ocupadas = ids.length - revincular.length;
      if (revincular.length > 0) {
        await supabaseAdmin.from("cautelas").update({ status: "vendida", aporte_id: r.aporte_id }).in("id", revincular);
      }
      if (ocupadas > 0) {
        return NextResponse.json({ ok: false, erro: `Não dá pra desfazer: ${ocupadas} cautela(s) deste resgate já foram vendidas em outro aporte. Ajuste manualmente.` }, { status: 409 });
      }
    }

    if (tipoEmpresa === "fidc" && r.quantidade_cotas_resgatadas) {
      const qtdAtual = Number(ap?.quantidade_cotas ?? 0);
      await supabaseAdmin.from("aportes")
        .update({ quantidade_cotas: qtdAtual + Number(r.quantidade_cotas_resgatadas), status: "ativo" })
        .eq("id", r.aporte_id);
    }

    if (ap?.status === "resgatado_total") {
      await supabaseAdmin.from("aportes").update({ status: "ativo" }).eq("id", r.aporte_id);
    }
  }

  const { error } = await supabaseAdmin.from("resgates").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
