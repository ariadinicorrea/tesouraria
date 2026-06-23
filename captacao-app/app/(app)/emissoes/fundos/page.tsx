import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";
export default function FundosPage() {
  noStore();
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Emissões</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Fundos (cotas)</h1></header>
      <div className="rounded-lg border bg-surface p-8 text-center text-muted">
        <p className="text-base font-medium text-ink">Em breve</p>
        <p className="mt-1 text-sm">A gestão de cotas dos fundos será construída na próxima etapa.</p>
      </div>
    </div>
  );
}
