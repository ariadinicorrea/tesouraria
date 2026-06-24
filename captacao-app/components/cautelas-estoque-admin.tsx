"use client";
import { useState, useMemo } from "react";
import { Card, Stat } from "@/components/ui";
import { fmtBRL } from "@/lib/format";

type Empresa = { id: string; nome: string };
type Cautela = { id: string; empresa_id: string; serie: string | null; codigo: number | null; valor: number; status: string; aporte_id: string | null };

export function CautelasEstoqueAdmin({ empresas, cautelas, sugestoes }: { empresas: Empresa[]; cautelas: Cautela[]; sugestoes: Record<string, number> }) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [serie, setSerie] = useState("");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [codigoInicial, setCodigoInicial] = useState(String(sugestoes[empresas[0]?.id] ?? 1));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState("");

  const [sel, setSel] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSerie, setEditSerie] = useState("");
  const [editValor, setEditValor] = useState("");

  function trocarEmpresa(id: string) { setEmpresaId(id); setCodigoInicial(String(sugestoes[id] ?? 1)); }

  const lista = useMemo(() => cautelas.filter((c) => !filtroEmpresa || c.empresa_id === filtroEmpresa), [cautelas, filtroEmpresa]);
  const totDisp = lista.filter((c) => c.status === "disponivel");
  const totVend = lista.filter((c) => c.status === "vendida");
  const somaDisp = totDisp.reduce((s, c) => s + Number(c.valor), 0);
  const somaVend = totVend.reduce((s, c) => s + Number(c.valor), 0);
  const somaTotal = lista.reduce((s, c) => s + Number(c.valor), 0);

  const disponiveisIds = totDisp.map((c) => c.id);
  const todasSelecionadas = disponiveisIds.length > 0 && disponiveisIds.every((id) => sel.includes(id));
  function toggleTodas() { setSel(todasSelecionadas ? [] : disponiveisIds); }
  function toggle(id: string) { setSel((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]); }

  const previa = (() => {
    const q = parseInt(quantidade, 10) || 0;
    const ini = parseInt(codigoInicial, 10) || 0;
    const v = Number(String(valor).replace(",", ".")) || 0;
    if (q <= 0 || ini <= 0) return null;
    return { de: ini, ate: ini + q - 1, total: q * v };
  })();

  async function criarLote() {
    setSalvando(true); setErro(null); setMsg(null);
    try {
      const res = await fetch("/api/cautelas-estoque", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresa_id: empresaId, serie, valor, quantidade, codigo_inicial: codigoInicial }) });
      const j = await res.json();
      if (!j.ok) { setErro(j.erro); return; }
      setMsg(`${j.criadas} cautela(s) criada(s).`); window.location.reload();
    } catch (e: any) { setErro("Erro ao conectar."); }
    finally { setSalvando(false); }
  }

  async function excluirLote() {
    if (sel.length === 0) return;
    if (!confirm(`Excluir ${sel.length} cautela(s) selecionada(s)? (apenas as disponíveis)`)) return;
    const res = await fetch(`/api/cautelas-estoque?ids=${sel.join(",")}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.ok) { alert(j.erro); return; }
    window.location.reload();
  }

  function abrirEdicao(c: Cautela) { setEditId(c.id); setEditSerie(c.serie ?? ""); setEditValor(String(c.valor)); }
  async function salvarEdicao() {
    const res = await fetch("/api/cautelas-estoque", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, serie: editSerie, valor: editValor }) });
    const j = await res.json();
    if (!j.ok) { alert(j.erro); return; }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Disponíveis (qtd)" value={String(totDisp.length)} />
        <Stat label="Disponíveis (R$)" value={fmtBRL(somaDisp)} />
        <Stat label="Vendidas (qtd)" value={String(totVend.length)} />
        <Stat label="Vendidas (R$)" value={fmtBRL(somaVend)} />
      </div>

      <Card>
        <h2 className="text-base font-semibold">Emitir cautelas em lote</h2>
        <p className="mt-1 text-sm text-muted">Gera cautelas sequenciais com o mesmo valor. Para valores diferentes, faça lotes separados.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">Empresa (securitizadora)
            <select value={empresaId} onChange={(e) => trocarEmpresa(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
          </label>
          <label className="block text-sm">Série / Emissão (texto livre)
            <input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="ex: 1ª Emissão 120% CDI" className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">Valor de cada cautela (R$)
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="ex: 1000,00" className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">Quantidade
            <input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="ex: 50" className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">Código inicial (sugerido)
            <input value={codigoInicial} onChange={(e) => setCodigoInicial(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
        </div>
        {previa && <p className="mt-3 text-sm text-muted">Vai criar cautelas <b className="text-ink">{previa.de}</b> a <b className="text-ink">{previa.ate}</b> · total <b className="text-ink">{fmtBRL(previa.total)}</b></p>}
        {erro && <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
        {msg && <div className="mt-3 rounded-md border bg-surface px-3 py-2 text-sm text-ink">✅ {msg}</div>}
        <button onClick={criarLote} disabled={salvando} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{salvando ? "Emitindo..." : "Emitir lote"}</button>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Estoque de cautelas</h2>
          <div className="flex items-center gap-2">
            {sel.length > 0 && <button onClick={excluirLote} className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">Excluir {sel.length} selecionada(s)</button>}
            <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)} className="rounded-md border px-3 py-1.5 text-sm">
              <option value="">Todas as empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted">
              <tr>
                <th className="px-3 py-2"><input type="checkbox" checked={todasSelecionadas} onChange={toggleTodas} title="Selecionar todas as disponíveis" /></th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Série</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Nenhuma cautela cadastrada.</td></tr>}
              {lista.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{c.status === "disponivel" && <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />}</td>
                  <td className="px-3 py-2 num">{c.codigo}</td>
                  <td className="px-3 py-2">{editId === c.id ? <input value={editSerie} onChange={(e) => setEditSerie(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" /> : c.serie}</td>
                  <td className="px-3 py-2 text-right num">{editId === c.id ? <input value={editValor} onChange={(e) => setEditValor(e.target.value)} className="w-28 rounded border px-2 py-1 text-right text-sm" /> : fmtBRL(Number(c.valor))}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "vendida" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{c.status === "vendida" ? "Vendida" : "Disponível"}</span></td>
                  <td className="px-3 py-2 text-right">
                    {c.status === "disponivel" && (editId === c.id ? (
                      <span className="flex justify-end gap-2"><button onClick={salvarEdicao} className="text-xs text-emerald-700 hover:underline">salvar</button><button onClick={() => setEditId(null)} className="text-xs text-muted hover:underline">cancelar</button></span>
                    ) : (
                      <button onClick={() => abrirEdicao(c)} className="text-xs text-ink hover:underline">editar</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
            {lista.length > 0 && (
              <tfoot className="border-t font-medium">
                <tr><td className="px-3 py-2" colSpan={3}>Total ({lista.length} cautela{lista.length > 1 ? "s" : ""})</td><td className="px-3 py-2 text-right num">{fmtBRL(somaTotal)}</td><td colSpan={2}></td></tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
