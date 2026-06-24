import { listarSecuritizadoras, listarCautelas, proximoCodigo, relatoriosCautelas } from "@/lib/cautelas-estoque";
import { CautelasEstoqueAdmin } from "@/components/cautelas-estoque-admin";
import { CautelasRelatorios } from "@/components/cautelas-relatorios";
import { SecuritizadoraTabs } from "@/components/securitizadora-tabs";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function SecuritizadoraPage() {
  noStore();
  const empresas = await listarSecuritizadoras();
  const cautelas = await listarCautelas();
  const sugestoes: Record<string, number> = {};
  for (const e of empresas) sugestoes[e.id] = await proximoCodigo(e.id);
  const rel = await relatoriosCautelas();

  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Emissões</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Securitizadora — Cautelas</h1></header>
      {empresas.length === 0 ? (
        <div className="rounded-lg border bg-surface p-8 text-center text-muted">
          Nenhuma empresa do tipo <b>Securitizadora</b> cadastrada. Cadastre em <b>Empresas</b> primeiro.
        </div>
      ) : (
        <SecuritizadoraTabs
          estoque={<CautelasEstoqueAdmin empresas={empresas as any} cautelas={cautelas as any} sugestoes={sugestoes} />}
          relatorios={<CautelasRelatorios estoque={rel.estoque} porAporte={rel.porAporte} porInvestidor={rel.porInvestidor} />}
        />
      )}
    </div>
  );
}
