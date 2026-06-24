"use client";
import { useState, useMemo } from "react";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
type Ref = { id: string; nome: string; baseado_em_cotas?: boolean; tipo?: string };
type Cautela = { id: string; empresa_id: string; serie: string; codigo?: number; valor?: number };
type Cota = { id: string; empresa_id: string; serie: string; valorAtual: number; iniciada: boolean };

export function NovoAporte({ empresas, investidores, instrumentos, agentes, cautelas = [], cotas = [] }: {
  empresas: Ref[]; investidores: { id: string; nome_razao_social: string }[]; instrumentos: Ref[];
  agentes: { id: string; nome: string; comissao_padrao: number }[];
  cautelas?: Cautela[]; cotas?: Cota[];
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [selCautelas, setSelCautelas] = useState<string[]>([]);
  const [cotaId, setCotaId] = useState("");
  const [modoCota, setModoCota] = useState<"valor" | "quantidade">("valor");
  const [qtdCotas, setQtdCotas] = useState("");
  const [f, setF] = useState({
    codigo: "", empresa_id: "", investidor_id: "", instrumento_id: "", cautela_id: "", data_aporte: new Date().toISOString().slice(0, 10),
    valor_aporte: "", tipo_remuneracao: "percentual_cdi", taxa_valor: "", periodo_taxa: "anual", percentual_cdi: "",
    data_vencimento: "", quantidade_cotas: "", valor_cota_aporte: "", agente_id: "", comissao_percentual: "",
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const instrumento = instrumentos.find((i) => i.id === f.instrumento_id);
  const agente = agentes.find((a) => a.id === f.agente_id);

  const empresa = empresas.find((e) => e.id === f.empresa_id);
  const ehSecuritizadora = empresa?.tipo === "securitizadora";
  const ehFundo = empresa?.tipo === "fidc";

  const cautelasEmpresa = useMemo(() => cautelas.filter((c) => c.empresa_id === f.empresa_id), [cautelas, f.empresa_id]);
  const somaCautelas = useMemo(() => cautelasEmpresa.filter((c) => selCautelas.includes(c.id)).reduce((s, c) => s + Number(c.valor ?? 0), 0), [cautelasEmpresa, selCautelas]);
  function toggleCautela(id: string) { setSelCautelas((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]); }

  const cotasFundo = useMemo(() => cotas.filter((c) => c.empresa_id === f.empresa_id), [cotas, f.empresa_id]);
  const cotaSel = cotasFundo.find((c) => c.id === cotaId);
  const valorCotaDia = cotaSel?.valorAtual ?? 0;
  const valorDigitado = Number(String(f.valor_aporte).replace(",", ".")) || 0;
  const qtdDigitada = Number(String(qtdCotas).replace(",", ".")) || 0;
  const fracoesCalc = ehFundo && valorCotaDia > 0 ? (modoCota === "valor" ? valorDigitado / valorCotaDia : qtdDigitada) : 0;
  const valorFundoCalc = ehFundo && valorCotaDia > 0 ? (modoCota === "valor" ? valorDigitado : qtdDigitada * valorCotaDia) : 0;

  function trocarEmpresa(id: string) { set("empresa_id", id); setSelCautelas([]); setCotaId(""); setQtdCotas(""); }

  async function salvar() {
    setSalvando(true); setErro(null); setOk(false);
    if (ehSecuritizadora && selCautelas.length === 0) { setSalvando(false); return setErro("Selecione ao menos uma cautela para a securitizadora."); }
    if (ehFundo && !cotaId) { setSalvando(false); return setErro("Selecione a cota do fundo."); }
    if (ehFundo && valorFundoCalc <= 0) { setSalvando(false); return setErro("Informe o valor ou a quantidade de cotas."); }

    const payload: any = { ...f };
    if (ehSecuritizadora) {
      payload.valor_aporte = String(somaCautelas);
      payload.cautela_ids = selCautelas;
    } else if (ehFundo) {
      payload.valor_aporte = String(valorFundoCalc);
      payload.cota_id = cotaId;
      payload.quantidade_cotas = String(fracoesCalc);
      payload.valor_cota_aporte = String(valorCotaDia);
    }
    const res = await fetch("/api/aportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json(); setSalvando(false);
    if (!json.ok) return setErro(json.erro);
    setOk(true); window.location.reload();
  }

  const fmtBRLloc = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });

  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><label className="eyebrow">Código / ID (opcional)</label><input className={input} value={f.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="ex: CTR-001" /></div>
        <div><label className="eyebrow">Empresa</label><select className={input} value={f.empresa_id} onChange={(e) => trocarEmpresa(e.target.value)}><option value="">Selecione…</option>{empresas.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}</select></div>
        <div><label className="eyebrow">Investidor</label><select className={input} value={f.investidor_id} onChange={(e) => set("investidor_id", e.target.value)}><option value="">Selecione…</option>{investidores.map((i) => (<option key={i.id} value={i.id}>{i.nome_razao_social}</option>))}</select></div>
        <div><label className="eyebrow">Instrumento</label><select className={input} value={f.instrumento_id} onChange={(e) => set("instrumento_id", e.target.value)}><option value="">Selecione…</option>{instrumentos.map((i) => (<option key={i.id} value={i.id}>{i.nome}</option>))}</select></div>
        <div><label className="eyebrow">Data do aporte</label><input type="date" className={input} value={f.data_aporte} onChange={(e) => set("data_aporte", e.target.value)} /></div>

        {!ehFundo && (
          <div>
            <label className="eyebrow">Valor do aporte (R$)</label>
            {ehSecuritizadora ? (
              <input className={input + " bg-paper/60"} value={fmtBRLloc(somaCautelas)} readOnly title="Soma das cautelas selecionadas" />
            ) : (
              <input className={input} inputMode="decimal" value={f.valor_aporte} onChange={(e) => set("valor_aporte", e.target.value)} />
            )}
          </div>
        )}

        {!ehFundo && (<>
          <div><label className="eyebrow">Modalidade</label><select className={input} value={f.tipo_remuneracao} onChange={(e) => set("tipo_remuneracao", e.target.value)}><option value="percentual_cdi">% do CDI</option><option value="cdi_mais">CDI + spread</option><option value="selic_mais">Selic + spread</option><option value="fixa">Taxa fixa</option></select></div>
          {f.tipo_remuneracao === "percentual_cdi" ? (
            <div><label className="eyebrow">% do CDI (1.10 = 110%)</label><input className={input} inputMode="decimal" value={f.percentual_cdi} onChange={(e) => set("percentual_cdi", e.target.value)} placeholder="1.10" /></div>
          ) : (
            <>
              <div><label className="eyebrow">{(f.tipo_remuneracao === "cdi_mais" || f.tipo_remuneracao === "selic_mais") ? "Spread (fração)" : "Taxa (fração)"}</label><input className={input} inputMode="decimal" value={f.taxa_valor} onChange={(e) => set("taxa_valor", e.target.value)} placeholder="0.02 = 2%" /></div>
              <div><label className="eyebrow">Período</label><select className={input} value={f.periodo_taxa} onChange={(e) => set("periodo_taxa", e.target.value)}><option value="anual">Anual</option><option value="mensal">Mensal</option></select></div>
            </>
          )}
        </>)}

        <div><label className="eyebrow">Agente captador (opcional)</label><select className={input} value={f.agente_id} onChange={(e) => set("agente_id", e.target.value)}><option value="">Nenhum</option>{agentes.map((a) => (<option key={a.id} value={a.id}>{a.nome}</option>))}</select></div>
        {f.agente_id && (
          <div><label className="eyebrow">Comissão (%) — vazio usa o padrão {agente ? (agente.comissao_padrao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + "%" : ""}</label><input className={input} inputMode="decimal" value={f.comissao_percentual} onChange={(e) => set("comissao_percentual", e.target.value)} placeholder={agente ? String((agente.comissao_padrao * 100)) : "0,02"} /></div>
        )}
      </div>

      {ehFundo && (
        <div className="mt-4 rounded-md border bg-paper p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="eyebrow">Cota do fundo</label>
              <select className={input} value={cotaId} onChange={(e) => setCotaId(e.target.value)}>
                <option value="">Selecione a cota…</option>
                {cotasFundo.map((c) => <option key={c.id} value={c.id}>{c.serie}</option>)}
              </select>
            </div>
            <div>
              <label className="eyebrow">Valor da cota hoje</label>
              <input className={input + " bg-paper/60"} value={cotaSel ? fmtBRLloc(valorCotaDia) : "—"} readOnly />
            </div>
            <div>
              <label className="eyebrow">Informar por</label>
              <select className={input} value={modoCota} onChange={(e) => setModoCota(e.target.value as any)}>
                <option value="valor">Valor em R$</option>
                <option value="quantidade">Quantidade de cotas</option>
              </select>
            </div>
            {modoCota === "valor" ? (
              <div><label className="eyebrow">Valor a aportar (R$)</label><input className={input} inputMode="decimal" value={f.valor_aporte} onChange={(e) => set("valor_aporte", e.target.value)} placeholder="0,00" /></div>
            ) : (
              <div><label className="eyebrow">Quantidade de cotas</label><input className={input} inputMode="decimal" value={qtdCotas} onChange={(e) => setQtdCotas(e.target.value)} placeholder="ex: 12,5" /></div>
            )}
          </div>
          {cotaSel && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted">Frações de cota: <b className="num text-ink">{fmtNum(fracoesCalc)}</b></span>
              <span className="text-muted">Valor do aporte: <b className="num text-accent">{fmtBRLloc(valorFundoCalc)}</b></span>
              {!cotaSel.iniciada && <span className="text-amber-700">Este será o 1º aporte — a cota passa a render a partir desta data.</span>}
            </div>
          )}
        </div>
      )}

      {ehSecuritizadora && (
        <div className="mt-4 rounded-md border bg-paper p-4">
          <div className="flex items-center justify-between">
            <label className="eyebrow">Cautelas disponíveis ({empresa?.nome}) — marque as que compõem o aporte</label>
            <span className="text-sm">Selecionado: <b>{fmtBRLloc(somaCautelas)}</b> · {selCautelas.length} cautela(s)</span>
          </div>
          {cautelasEmpresa.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhuma cautela disponível para esta empresa. Cadastre em Emissões → Securitizadora.</p>
          ) : (
            <div className="mt-2 max-h-56 overflow-y-auto rounded border">
              <table className="w-full text-sm">
                <thead className="border-b bg-surface text-left text-muted">
                  <tr><th className="px-3 py-1.5"></th><th className="px-3 py-1.5 font-medium">Código</th><th className="px-3 py-1.5 font-medium">Série</th><th className="px-3 py-1.5 text-right font-medium">Valor</th></tr>
                </thead>
                <tbody>
                  {cautelasEmpresa.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-1.5"><input type="checkbox" checked={selCautelas.includes(c.id)} onChange={() => toggleCautela(c.id)} /></td>
                      <td className="px-3 py-1.5 num">{c.codigo}</td>
                      <td className="px-3 py-1.5">{c.serie}</td>
                      <td className="px-3 py-1.5 text-right num">{fmtBRLloc(Number(c.valor ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-accent">Aporte registrado.</p>}
      <div className="mt-4"><button onClick={salvar} disabled={salvando} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Salvando…" : "Registrar aporte"}</button></div>
    </div>
  );
}
