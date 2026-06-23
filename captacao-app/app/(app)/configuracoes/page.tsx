import { getLogo } from "@/lib/config";
import { ConfigLogo } from "@/components/config-logo";
import { LimparDados } from "@/components/limpar-dados";
import { AtualizarIndices } from "@/components/atualizar-indices";
import { unstable_noStore as noStore } from "next/cache";
export const dynamic = "force-dynamic";
export default async function ConfiguracoesPage() {
  noStore();
  const logo = await getLogo();
  return (
    <div className="p-8">
      <header className="mb-6"><div className="eyebrow">Sistema</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Configurações</h1></header>
      <ConfigLogo logoAtual={logo} />
      <AtualizarIndices />
      <LimparDados />
    </div>
  );
}
