import { listarFundos, listarCotasComValor } from "@/lib/cotas-fundos";
import { CotasFundosAdmin } from "@/components/cotas-fundos-admin";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";

export default async function FundosPage() {
  noStore();
  const empresas = await listarFundos();
  const cotas = await listarCotasComValor();
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Emissões</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Fundos — Cotas</h1></header>
      {empresas.length === 0 ? (
        <div className="rounded-lg border bg-surface p-8 text-center text-muted">
          Nenhuma empresa do tipo <b>FIDC / Fundo</b> cadastrada. Cadastre em <b>Empresas</b> primeiro.
        </div>
      ) : (
        <CotasFundosAdmin empresas={empresas as any} cotas={cotas as any} />
      )}
    </div>
  );
}
