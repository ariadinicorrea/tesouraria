import { computeResgateDetalhe } from "@/lib/aporte";
import { ResgateAcoes } from "@/components/resgate-acoes";
import { fmtBRL, fmtPct, fmtData } from "@/lib/format";
import { notFound } from "next/navigation";
import { getLogo } from "@/lib/config";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";


export default async function Comprovante({ params }: { params: { id: string } }) {
  noStore();
  const d = await computeResgateDetalhe(params.id);
  if (!d) notFound();
  const r: any = d.resgate;
  const logo = await getLogo();
  const rotuloTipo = r.tipo_resgate === "total" ? "Resgate total" : r.tipo_resgate === "apenas_juros" ? "Resgate de juros" : "Resgate parcial";
  const mensagem = `Olá, ${d.investidor}. Comprovante de ${rotuloTipo} em ${fmtData(r.data_resgate)}: valor bruto ${fmtBRL(Number(r.valor_bruto))}, IR ${fmtBRL(Number(r.ir_retido))}, valor líquido ${fmtBRL(Number(r.valor_liquido))}. ${d.empresa}.`;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="no-print"><Link href="/resgates" className="text-sm text-muted hover:text-ink">← Resgates</Link></div>
      <div className="mt-3">
        <ResgateAcoes resgateId={params.id} status={r.status} email={d.email} telefone={d.telefone} mensagem={mensagem} />
      </div>

      <div className="rounded-lg border bg-surface p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
            <div>
              <div className="text-lg font-semibold tracking-tight">Comprovante de Resgate</div>
              <div className="text-sm text-muted">{r.status === "efetuado" ? "Efetuado" : "Solicitação (pendente)"} · {fmtData(r.data_resgate)}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted">Investidor:</span> <b>{d.investidor}</b></div>
          <div><span className="text-muted">Documento:</span> <span className="num">{d.documento}</span></div>
          <div><span className="text-muted">Empresa:</span> {d.empresa}</div>
          <div><span className="text-muted">Tipo:</span> {rotuloTipo}</div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div><div className="eyebrow">Valor bruto</div><div className="num mt-1 font-semibold">{fmtBRL(Number(r.valor_bruto))}</div></div>
          <div><div className="eyebrow">IR retido ({fmtPct(Number(r.aliquota_ir), 1)})</div><div className="num mt-1 font-semibold text-warn">{fmtBRL(Number(r.ir_retido))}</div></div>
          <div><div className="eyebrow">Valor líquido</div><div className="num mt-1 font-semibold text-accent">{fmtBRL(Number(r.valor_liquido))}</div></div>
        </div>
        <p className="mt-6 text-[0.7rem] leading-relaxed text-muted">Documento informativo. IR conforme regime tributário do instrumento (contratos de mútuo isentos). Prazo considerado: {r.prazo_dias} dias.</p>
      </div>
    </div>
  );
}
