"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const input = "w-full rounded-md border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";
type Ref = { id: string; nome: string; baseado_em_cotas?: boolean };
export function NovoAporte({ empresas, investidores, instrumentos, agentes, cautelas = [] }: {
  empresas: Ref[]; investidores: { id: string; nome_razao_social: string }[]; instrumentos: Ref[];
  agentes: { id: string; nome: string; comissao_padrao: number }[];
  cautelas?: { id: string; empresa_id: string; serie: string }[];
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [f, setF] = useState({
    codigo: "", empresa_id: "", investidor_id: "", instrumento_id: "", cautela_id: "", data_aporte: new Date().toISOString().slice(0, 10),
    valor_aporte: "", tipo_remuneracao: "percentual_cdi", taxa_valor: "", periodo_taxa: "anual", percentual_cdi: "",
    data_vencimento: "", quantidade_cotas: "", valor_cota_aporte: "", agente_id: "", comissao_percentual: "",
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const instrumento = instrumentos.find((i) => i.id === f.instrumento_id);
  const ehCotas = instrumento?.baseado_em_cotas;
  const agente = agentes.find((a) => a.id === f.agente_id);
  async function salvar() {
    setSalvando(true); setErro(null); setOk(false);
    const res = await fetch("/api/aportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const json = await res.json(); setSalvando(false);
    if (!json.ok) return setErro(json.erro);
    setOk(true); router.refresh();
  }
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><label className="eyebrow">Código / ID (opcional)</label><input className={input} value={f.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="ex: CTR-001" /></div>
        <div><label className="eyebrow">Empresa</label><select className={input} value={f.empresa_id} onChange={(e) => set("empresa_id", e.target.value)}><option value="">Selecione…</option>{empresas.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}</select></div>
        <div><label className="eyebrow">Investidor</label><select className={input} value={f.investidor_id} onChange={(e) => set("investidor_id", e.target.value)}><option value="">Selecione…</option>{investidores.map((i) => (<option key={i.id} value={i.id}>{i.nome_razao_social}</option>))}</select></div>
        <div><label className="eyebrow">Instrumento</label><select className={input} value={f.instrumento_id} onChange={(e) => set("instrumento_id", e.target.value)}><option value="">Selecione…</option>{instrumentos.map((i) => (<option key={i.id} value={i.id}>{i.nome}</option>))}</select></div>
        <div><label className="eyebrow">Data do aporte</label><input type="date" className={input} value={f.data_aporte} onChange={(e) => set("data_aporte", e.target.value)} /></div>
        <div><label className="eyebrow">Valor do aporte (R$)</label><input className={input} inputMode="decimal" value={f.valor_aporte} onChange={(e) => set("valor_aporte", e.target.value)} /></div>
        <div><label className="eyebrow">Vencimento</label><input type="date" className={input} value={f.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} /></div>
        <div><label className="eyebrow">Modalidade</label><select className={input} value={f.tipo_remuneracao} onChange={(e) => set("tipo_remuneracao", e.target.value)}><option value="percentual_cdi">% do CDI</option><option value="cdi_mais">CDI + spread</option><option value="selic_mais">Selic + spread</option><option value="fixa">Taxa fixa</option></select></div>
        {f.tipo_remuneracao === "percentual_cdi" ? (
          <div><label className="eyebrow">% do CDI (1.10 = 110%)</label><input className={input} inputMode="decimal" value={f.percentual_cdi} onChange={(e) => set("percentual_cdi", e.target.value)} placeholder="1.10" /></div>
        ) : (
          <>
            <div><label className="eyebrow">{(f.tipo_remuneracao === "cdi_mais" || f.tipo_remuneracao === "selic_mais") ? "Spread (fração)" : "Taxa (fração)"}</label><input className={input} inputMode="decimal" value={f.taxa_valor} onChange={(e) => set("taxa_valor", e.target.value)} placeholder="0.02 = 2%" /></div>
            <div><label className="eyebrow">Período</label><select className={input} value={f.periodo_taxa} onChange={(e) => set("periodo_taxa", e.target.value)}><option value="anual">Anual</option><option value="mensal">Mensal</option></select></div>
          </>
        )}
        {ehCotas && (<>
          <div><label className="eyebrow">Quantidade de cotas</label><input className={input} inputMode="decimal" value={f.quantidade_cotas} onChange={(e) => set("quantidade_cotas", e.target.value)} /></div>
          <div><label className="eyebrow">Valor da cota no aporte (R$)</label><input className={input} inputMode="decimal" value={f.valor_cota_aporte} onChange={(e) => set("valor_cota_aporte", e.target.value)} /></div>
        </>)}
        <div><label className="eyebrow">Agente captador (opcional)</label><select className={input} value={f.agente_id} onChange={(e) => set("agente_id", e.target.value)}><option value="">Nenhum</option>{agentes.map((a) => (<option key={a.id} value={a.id}>{a.nome}</option>))}</select></div>
        {cautelas.filter((c) => c.empresa_id === f.empresa_id).length > 0 && (<div><label className="eyebrow">Emissão / cautela (opcional)</label><select className={input} value={f.cautela_id} onChange={(e) => set("cautela_id", e.target.value)}><option value="">Nenhuma</option>{cautelas.filter((c) => c.empresa_id === f.empresa_id).map((c) => (<option key={c.id} value={c.id}>{c.serie}</option>))}</select></div>)}
        {f.agente_id && (
          <div><label className="eyebrow">Comissão (%) — vazio usa o padrão {agente ? (agente.comissao_padrao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + "%" : ""}</label><input className={input} inputMode="decimal" value={f.comissao_percentual} onChange={(e) => set("comissao_percentual", e.target.value)} placeholder={agente ? String((agente.comissao_padrao * 100)) : "0,02"} /></div>
        )}
      </div>
      {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-accent">Aporte registrado.</p>}
      <div className="mt-4"><button onClick={salvar} disabled={salvando} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Salvando…" : "Registrar aporte"}</button></div>
    </div>
  );
}
