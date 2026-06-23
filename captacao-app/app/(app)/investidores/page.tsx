import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";
import { NovoInvestidor } from "@/components/novo-investidor";
import { Tabela, type Coluna } from "@/components/tabela";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function InvestidoresPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams?.q || "").replace(/[(),]/g, " ").trim();
  let query = supabaseAdmin.from("investidores").select("*").order("nome_razao_social");
  if (q) query = query.or(`nome_razao_social.ilike.%${q}%,documento.ilike.%${q}%`);
  const { data: investidores } = await query;

  const linhas = (investidores ?? []).map((i) => ({
    id: i.id, nome_razao_social: i.nome_razao_social, documento: i.documento,
    tipo_pessoa: i.tipo_pessoa, email: i.email ?? "—", data_ingresso: i.data_ingresso,
  }));
  const colunas: Coluna[] = [
    { chave: "nome_razao_social", rotulo: "Nome / Razão social", linkBase: "/investidores/" },
    { chave: "documento", rotulo: "Documento" },
    { chave: "tipo_pessoa", rotulo: "Tipo" },
    { chave: "email", rotulo: "E-mail" },
    { chave: "data_ingresso", rotulo: "Ingresso", tipo: "data" },
    { chave: "acoes", rotulo: "", links: [{ rotulo: "Ver posição →", base: "/investidores/" }] },
  ];
  return (
    <div className="p-8">
      <header className="flex items-end justify-between">
        <div><div className="eyebrow">Cadastro</div><h1 className="mt-1 text-xl font-semibold tracking-tight">Investidores</h1></div>
        <NovoInvestidor />
      </header>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div><label className="eyebrow">Buscar investidor</label><br />
          <input name="q" defaultValue={q} placeholder="Nome ou documento" className="w-64 rounded-md border bg-surface px-3 py-2 text-sm" /></div>
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Buscar</button>
        {q && <a href="/investidores" className="rounded-md border px-4 py-2 text-sm hover:bg-paper">Limpar</a>}
      </form>
      <Card className="mt-4">
        <Tabela colunas={colunas} linhas={linhas} vazio={q ? "Nenhum investidor encontrado para essa busca." : "Nenhum investidor cadastrado."} />
      </Card>
    </div>
  );
}
