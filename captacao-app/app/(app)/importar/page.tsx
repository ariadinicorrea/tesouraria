import { Importador } from "@/components/importador";
export const dynamic = "force-dynamic";
export default function ImportarPage() {
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Sistema</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Importar do Excel (CSV)</h1></header>
      <Importador />
    </div>
  );
}
