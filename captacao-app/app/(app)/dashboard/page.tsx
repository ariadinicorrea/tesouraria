import { computeDashboard, type DashboardData } from "@/lib/dashboard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeCautelas } from "@/lib/cautelas";
import { Card, Stat } from "@/components/ui";
import { EscopoSelector } from "@/components/escopo-selector";
import { fmtBRL, fmtPct, fmtNum, fmtData } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function DashboardPage({ searchParams }: { searchParams: { escopo?: string } }) {
  const escopo = searchParams?.escopo ?? "consolidado";
  const { data: empresas } = await supabaseAdmin.from("empresas").select("id, nome").eq("ativo", true).order("nome");
  const { data: solicitados } = await supabaseAdmin.from("resgates")
    .select("id, valor_bruto, data_resgate, aportes(investidores(nome_razao_social))")
    .eq("status", "solicitado").order("data_resgate", { ascending: true });
  let cautelasAlerta: any[] = [];
  try { const cs = await computeCautelas(); cautelasAlerta = cs.filter((c) => c.disponivel < 0 || (c.diasParaVencer != null && c.diasParaVencer <= 60)); } catch {}

  let d: DashboardData | null = null;
  let erro: string | null = null;
  try { d = await computeDashboard(escopo); } catch (e) { erro = (e as Error).message; }

  if (erro || !d) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Card className="mt-6 p-6">
          <div className="eyebrow">Sem dados ainda</div>
          <p className="mt-2 max-w-xl text-sm text-muted">Rode o schema.sql e o seed.sql no Supabase e confira o .env. Detalhe: {erro ?? "sem retorno"}.</p>
        </Card>
      </div>
    );
  }

  const nomeEscopo = escopo === "consolidado" ? "Consolidado do grupo" : (empresas ?? []).find((e) => e.id === escopo)?.nome ?? "Empresa";

  return (
    <div className="p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{nomeEscopo}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Dashboard executivo</h1>
        </div>
        <div className="flex items-center gap-3">
          <EscopoSelector empresas={empresas ?? []} atual={escopo} />
        </div>
      </header>

      {/* Faixa do CDI em uso */}
      <div className="mt-5 flex items-center gap-2 rounded-md border bg-surface px-4 py-2 text-sm">
        <span className="eyebrow">CDI usado nos cálculos</span>
        <span className="num font-semibold text-ink">{fmtPct(d.cdiAtual)} a.a.</span>
        <span className="text-xs text-muted">(referência {fmtData(d.cdiData)} — Banco Central)</span>
      </div>

      {(solicitados && solicitados.length > 0) && (
        <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 p-4">
          <div className="flex items-center justify-between">
            <div className="eyebrow text-warn">Resgates solicitados — aguardando efetivação ({solicitados.length})</div>
            <a href="/resgates" className="text-xs text-muted hover:text-ink">ver todos →</a>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {solicitados.slice(0, 5).map((r: any) => (
              <a key={r.id} href={`/resgates/${r.id}/comprovante`} className="flex justify-between hover:text-accent">
                <span>{r.aportes?.investidores?.nome_razao_social ?? "—"} · {fmtData(r.data_resgate)}</span>
                <span className="num font-semibold">{fmtBRL(Number(r.valor_bruto))}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {cautelasAlerta.length > 0 && (
        <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 p-4">
          <div className="flex items-center justify-between">
            <div className="eyebrow text-warn">Cautelas / emissões — atenção ({cautelasAlerta.length})</div>
            <a href="/cautelas" className="text-xs text-muted hover:text-ink">gerenciar →</a>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {cautelasAlerta.slice(0, 6).map((c: any) => (
              <div key={c.id} className="flex justify-between">
                <span>{c.empresa} · {c.serie}</span>
                <span className="num">{c.disponivel < 0 ? <b className="text-neg">vendida além do emitido ({c.disponivel.toLocaleString("pt-BR")})</b> : <span className="text-warn">vence em {c.diasParaVencer}d</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero: taxa média ponderada */}
      <Card className="mt-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="border-b p-7 md:border-b-0 md:border-r">
            <div className="eyebrow">Taxa média ponderada de captação — mensal</div>
            <div className="num mt-3 text-5xl font-semibold tracking-tight text-accent">
              {fmtPct(d.taxaMedia.mensal, 3)}<span className="ml-2 align-top text-base font-medium text-muted">ao mês</span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <span className="text-muted">Diária <b className="num font-semibold text-ink">{fmtPct(d.taxaMedia.diaria, 4)}</b></span>
              <span className="text-muted">Anual <b className="num font-semibold text-ink">{fmtPct(d.taxaMedia.anual)}</b></span>
            </div>
          </div>
          <div className="border-b p-7 md:border-b-0 md:border-r">
            <div className="eyebrow">Saldo bruto hoje</div>
            <div className="num mt-3 text-3xl font-semibold">{fmtBRL(d.totalCaptado)}</div>
            <div className="mt-2 text-xs text-muted">aportado: {fmtBRL(d.totalAportado)} · {fmtNum(d.numInvestidores)} investidores</div>
          </div>
          <div className="p-7">
            <div className="eyebrow">Custo anual de funding</div>
            <div className="num mt-3 text-3xl font-semibold text-warn">{fmtBRL(d.custo.anual)}</div>
            <div className="mt-2 text-xs text-muted">taxa {fmtPct(d.taxaMedia.anual)} a.a.</div>
          </div>
        </div>
      </Card>

      {/* Custo diário e mensal: R$ e % */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Custo diário" value={fmtBRL(d.custo.diario)} hint={`${fmtPct(d.taxaMedia.diaria, 4)} ao dia`} tone="warn" />
        <Stat label="Custo mensal" value={fmtBRL(d.custo.mensal)} hint={`${fmtPct(d.taxaMedia.mensal, 3)} ao mês`} tone="warn" />
        <Stat label="Custo anual" value={fmtBRL(d.custo.anual)} hint={`${fmtPct(d.taxaMedia.anual)} ao ano`} tone="warn" />
        <Stat label="Vencimentos ≤ 30d" value={fmtNum(d.vencimentosProximos.length)} />
      </div>

      {/* Por empresa: custo médio */}
      <Card className="mt-6">
        <div className="border-b px-5 py-3 eyebrow">Custo médio por empresa</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Empresa</th>
            <th className="px-5 py-2 font-medium">Tipo</th>
            <th className="px-5 py-2 text-right font-medium">Saldo</th>
            <th className="px-5 py-2 text-right font-medium">Custo médio (a.a.)</th>
            <th className="px-5 py-2 text-right font-medium">Custo mensal</th>
            <th className="px-5 py-2 text-right font-medium">Custo anual</th>
          </tr></thead>
          <tbody>
            {d.porEmpresa.map((e) => (
              <tr key={e.empresaId} className="border-t">
                <td className="px-5 py-3 font-medium">{e.nome}</td>
                <td className="px-5 py-3 text-muted">{e.tipo}</td>
                <td className="num px-5 py-3 text-right">{fmtBRL(e.saldoBruto)}</td>
                <td className="num px-5 py-3 text-right text-accent">{fmtPct(e.taxaMediaAnual)}</td>
                <td className="num px-5 py-3 text-right text-warn">{fmtBRL(e.custoMensal)}</td>
                <td className="num px-5 py-3 text-right text-warn">{fmtBRL(e.custoAnual)}</td>
              </tr>
            ))}
            {d.porEmpresa.length === 0 && (<tr><td colSpan={6} className="px-5 py-6 text-center text-muted">Nenhum aporte ativo neste escopo.</td></tr>)}
          </tbody>
        </table>
      </Card>

      {d.vencimentosProximos.length > 0 && (
        <Card className="mt-6">
          <div className="border-b px-5 py-3 eyebrow">Vencimentos nos próximos 30 dias</div>
          <table className="w-full text-sm"><tbody>
            {d.vencimentosProximos.map((v, i) => (
              <tr key={i} className="border-t">
                <td className="px-5 py-3 font-medium">{v.investidor}</td>
                <td className="px-5 py-3 text-muted">{v.empresa}</td>
                <td className="num px-5 py-3 text-right">{fmtBRL(v.valor)}</td>
                <td className="num px-5 py-3 text-right text-muted">{fmtData(v.vencimento)}</td>
              </tr>
            ))}
          </tbody></table>
        </Card>
      )}
    </div>
  );
}
