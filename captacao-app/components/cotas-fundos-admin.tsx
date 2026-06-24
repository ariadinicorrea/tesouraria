"use client";
import { useState } from "react";
import { Card, Stat } from "@/components/ui";
import { fmtBRL } from "@/lib/format";

type Empresa = { id: string; nome: string };
type Cota = { id: string; empresa_id: string; serie: string; valor_inicial: number; data_inicio: string | null; tipo_remuneracao: string; taxa_valor: number | null; periodo_taxa: string | null; percentual_cdi: number | null; valorAtual: number; taxaEfAnual: number; rendimentoPct: number; iniciada: boolean };

const input = "mt-1 w-full rounded-md border px-3 py-2 text-sm";
const fmtData = (d: string | null) => d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
const fmtPct = (v: number) => (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

function remuneracaoLabel(c: Cota) {
  if (c.tipo_remuneracao === "percentual_cdi") return `${((c.percentual_cdi ?? 0) * 100).toLocaleString("pt-BR")}% do CDI`;
  if (c.tipo_remuneracao === "cdi_mais") return `CDI + ${fmtPct(c.taxa_valor ?? 0)} ${c.periodo_taxa === "mensal" ? "a.m." : "a.a."}`;
  if (c.tipo_remuneracao === "selic_mais") return `Selic + ${fmtPct(c.taxa_valor ?? 0)} ${c.periodo_taxa === "mensal" ? "a.m." : "a.a."}`;
  return `Fixa ${fmtPct(c.taxa_valor ?? 0)} ${c.periodo_taxa === "mensal" ? "a.m." : "a.a."}`;
}

export function CotasFundosAdmin({ empresas, cotas }: { empresas: Empresa[]; cotas: Cota[] }) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [serie, setSerie] = useState("");
  const [valorInicial, setValorInicial] = useState("1000,00");
  const [tipoRem, setTipoRem] = useState("percentual_cdi");
  const [percentualCdi, setPercentualCdi] = useState("");
  const [taxaValor, setTaxaValor] = useState("");
  const [periodoTaxa, setPeriodoTaxa] = useState("anual");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const [sel, setSel] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [eSerie, setESerie] = useState("");
  const [eValor, setEValor] = useState("");
  const [eTipo, setETipo] = useState("percentual_cdi");
  const [ePct, setEPct] = useState("");
  const [eTaxa, setETaxa] = useState("");
  const [ePeriodo, setEPeriodo] = useState("anual");

  const lista = cotas.filter((c) => !filtro || c.empresa_id === filtro);
  const somaInicial = lista.reduce((s, c) => s + Number(c.valor_inicial), 0);
  const somaAtual = lista.reduce((s, c) => s + c.valorAtual, 0);

  const livresIds = lista.filter((c) => !c.iniciada).map((c) => c.id);
  const todasSel = livresIds.length > 0 && livresIds.every((id) => sel.includes(id));
  function toggleTodas() { setSel(todasSel ? [] : livresIds); }
  function toggle(id: string) { setSel((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]); }

  async function criar() {
    setSalvando(true); setErro(null);
    try {
      const res = await fetch("/api/cotas-fundos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresa_id: empresaId, serie, valor_inicial: valorInicial, tipo_remuneracao: tipoRem, percentual_cdi: percentualCdi, taxa_valor: taxaValor, periodo_taxa: periodoTaxa }) });
      const j = await res.json();
      if (!j.ok) { setErro(j.erro); return; }
      window.location.reload();
    } catch (e: any) { setErro("Erro ao conectar."); }
    finally { setSalvando(false); }
  }

  async function excluirLote() {
    if (sel.length === 0) return;
    if (!confirm(`Excluir ${sel.length} cota(s)? (apenas as sem aporte)`)) return;
    const res = await fetch(`/api/cotas-fundos?ids=${sel.join(",")}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.ok) { alert(j.erro); return; }
    window.location.reload();
  }

  function abrirEdicao(c: Cota) {
    setEditId(c.id); setESerie(c.serie); setEValor(String(c.valor_inicial));
    setETipo(c.tipo_remuneracao); setEPct(String(c.percentual_cdi ?? "")); setETaxa(String(c.taxa_valor ?? "")); setEPeriodo(c.periodo_taxa ?? "anual");
  }
  async function salvarEdicao() {
    const body: any = { id: editId, serie: eSerie, valor_inicial: eValor, tipo_remuneracao: eTipo };
    if (eTipo === "percentual_cdi") body.percentual_cdi = ePct; else { body.taxa_valor = eTaxa; body.periodo_taxa = ePeriodo; }
    const res = await fetch("/api/cotas-fundos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!j.ok) { alert(j.erro); return; }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Cotas cadastradas" value={String(lista.length)} />
        <Stat label="Soma valor atual" value={fmtBRL(somaAtual)} tone="accent" />
        <Stat label="Fundos" value={String(empresas.length)} />
      </div>

      <Card>
        <h2 className="text-base font-semibold">Cadastrar cota</h2>
        <p className="mt-1 text-sm text-muted">A cota vale o valor inicial (ex: 1.000) e fica parada até o <b>primeiro aporte</b>. A partir daí, começa a render pela taxa definida.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">Fundo<select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={input}>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
          <label className="block text-sm">Série / nome da cota<input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="ex: Cota Sênior 110% CDI" className={input} /></label>
          <label className="block text-sm">Valor inicial da cota (R$)<input value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} className={input} /></label>
          <label className="block text-sm">Modalidade<select value={tipoRem} onChange={(e) => setTipoRem(e.target.value)} className={input}><option value="percentual_cdi">% do CDI</option><option value="cdi_mais">CDI + spread</option><option value="selic_mais">Selic + spread</option><option value="fixa">Taxa fixa</option></select></label>
          {tipoRem === "percentual_cdi" ? (
            <label className="block text-sm">% do CDI (1.10 = 110%)<input value={percentualCdi} onChange={(e) => setPercentualCdi(e.target.value)} placeholder="1.10" className={input} /></label>
          ) : (<>
            <label className="block text-sm">{tipoRem === "fixa" ? "Taxa (fração)" : "Spread (fração)"}<input value={taxaValor} onChange={(e) => setTaxaValor(e.target.value)} placeholder="0.02 = 2%" className={input} /></label>
            <label className="block text-sm">Período<select value={periodoTaxa} onChange={(e) => setPeriodoTaxa(e.target.value)} className={input}><option value="anual">Anual</option><option value="mensal">Mensal</option></select></label>
          </>)}
        </div>
        {erro && <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
        <button onClick={criar} disabled={salvando} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{salvando ? "Salvando..." : "Cadastrar cota"}</button>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Cotas e valor atual</h2>
          <div className="flex items-center gap-2">
            {sel.length > 0 && <button onClick={excluirLote} className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">Excluir {sel.length} selecionada(s)</button>}
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-md border px-3 py-1.5 text-sm"><option value="">Todos os fundos</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted">
              <tr>
                <th className="px-3 py-2"><input type="checkbox" checked={todasSel} onChange={toggleTodas} title="Selecionar todas sem aporte" /></th>
                <th className="px-3 py-2 font-medium">Série</th>
                <th className="px-3 py-2 font-medium">Remuneração</th>
                <th className="px-3 py-2 font-medium">Início</th>
                <th className="px-3 py-2 text-right font-medium">Valor inicial</th>
                <th className="px-3 py-2 text-right font-medium">Valor hoje</th>
                <th className="px-3 py-2 text-right font-medium">Rendimento</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">Nenhuma cota cadastrada.</td></tr>}
              {lista.map((c) => {
                const emEdicao = editId === c.id;
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{!c.iniciada && <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />}</td>
                    <td className="px-3 py-2">{emEdicao ? <input value={eSerie} onChange={(e) => setESerie(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" /> : c.serie}</td>
                    <td className="px-3 py-2 text-xs">
                      {emEdicao ? (
                        <div className="flex flex-col gap-1">
                          <select value={eTipo} onChange={(e) => setETipo(e.target.value)} className="rounded border px-1 py-0.5 text-xs"><option value="percentual_cdi">% CDI</option><option value="cdi_mais">CDI+</option><option value="selic_mais">Selic+</option><option value="fixa">Fixa</option></select>
                          {eTipo === "percentual_cdi" ? <input value={ePct} onChange={(e) => setEPct(e.target.value)} placeholder="1.10" className="w-20 rounded border px-1 py-0.5 text-xs" /> : <input value={eTaxa} onChange={(e) => setETaxa(e.target.value)} placeholder="0.02" className="w-20 rounded border px-1 py-0.5 text-xs" />}
                        </div>
                      ) : remuneracaoLabel(c)}
                    </td>
                    <td className="px-3 py-2">{c.iniciada ? fmtData(c.data_inicio) : <span className="text-xs text-muted">aguardando 1º aporte</span>}</td>
                    <td className="px-3 py-2 text-right num">{emEdicao ? <input value={eValor} onChange={(e) => setEValor(e.target.value)} className="w-24 rounded border px-2 py-1 text-right text-sm" /> : fmtBRL(Number(c.valor_inicial))}</td>
                    <td className="px-3 py-2 text-right num font-medium">{fmtBRL(c.valorAtual)}</td>
                    <td className="px-3 py-2 text-right num text-accent">{c.iniciada ? fmtPct(c.rendimentoPct) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {!c.iniciada && (emEdicao ? (
                        <span className="flex justify-end gap-2"><button onClick={salvarEdicao} className="text-xs text-emerald-700 hover:underline">salvar</button><button onClick={() => setEditId(null)} className="text-xs text-muted hover:underline">cancelar</button></span>
                      ) : (
                        <button onClick={() => abrirEdicao(c)} className="text-xs text-ink hover:underline">editar</button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {lista.length > 0 && (
              <tfoot className="border-t font-medium">
                <tr><td className="px-3 py-2" colSpan={4}>Total ({lista.length} cota{lista.length > 1 ? "s" : ""})</td><td className="px-3 py-2 text-right num">{fmtBRL(somaInicial)}</td><td className="px-3 py-2 text-right num">{fmtBRL(somaAtual)}</td><td colSpan={2}></td></tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
