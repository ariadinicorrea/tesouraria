"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtMoeda = (v: any) => brl.format(Number(v) || 0);
const fmtData = (iso: any) => { if (!iso) return "—"; const [a, m, d] = String(iso).slice(0, 10).split("-"); return `${d}/${m}/${a}`; };
const fmtPct = (v: any) => `${((Number(v) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function badge(v: any) {
  const s = String(v || "").toLowerCase();
  const cor = ["efetuado", "pago", "ativo"].includes(s) ? "text-accent" : ["solicitado", "pendente"].includes(s) ? "text-warn" : "text-muted";
  return <span className={cor}>{v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "—"}</span>;
}

export type Coluna = {
  chave: string;
  rotulo: string;
  tipo?: "texto" | "moeda" | "data" | "pct" | "status";
  align?: "left" | "right";
  ordenavel?: boolean;
  linkBase?: string;
  links?: { rotulo: string; base: string; sufixo?: string }[];
  acao?: { rotulo: string; base: string; metodo?: string; confirmar?: string };
};

export function Tabela({ colunas, linhas, inicial = 1000, vazio = "Nada encontrado." }: {
  colunas: Coluna[]; linhas: any[]; inicial?: number; vazio?: string;
}) {
  const router = useRouter();
  const [ordKey, setOrdKey] = useState<string | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [todos, setTodos] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const ordenadas = useMemo(() => {
    if (!ordKey) return linhas;
    const arr = [...linhas];
    arr.sort((a, b) => {
      let va = a[ordKey], vb = b[ordKey];
      const na = Number(va), nb = Number(vb);
      const ambosNum = va !== "" && vb !== "" && va != null && vb != null && !isNaN(na) && !isNaN(nb);
      if (ambosNum) return dir === "asc" ? na - nb : nb - na;
      va = String(va ?? ""); vb = String(vb ?? "");
      return dir === "asc" ? va.localeCompare(vb, "pt-BR") : vb.localeCompare(va, "pt-BR");
    });
    return arr;
  }, [linhas, ordKey, dir]);

  const visiveis = todos ? ordenadas : ordenadas.slice(0, inicial);

  function clicar(c: Coluna) {
    if (c.ordenavel === false || c.links || c.acao) return;
    if (ordKey === c.chave) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrdKey(c.chave); setDir("asc"); }
  }

  async function executarAcao(c: Coluna, id: string) {
    if (c.acao?.confirmar && !confirm(c.acao.confirmar)) return;
    setBusyId(id);
    try {
      const res = await fetch(c.acao!.base + id, { method: c.acao!.metodo || "DELETE" });
      let j: any = null; try { j = await res.json(); } catch {}
      if (!res.ok || (j && j.ok === false)) { alert((j && j.erro) || "Não foi possível concluir."); setBusyId(null); return; }
      router.refresh();
    } catch (e: any) { alert("Erro: " + (e?.message || "")); }
    setBusyId(null);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted">
            {colunas.map((c) => (
              <th key={c.chave} onClick={() => clicar(c)}
                className={`px-5 py-2 font-medium ${c.align === "right" ? "text-right" : ""} ${c.ordenavel === false || c.links || c.acao ? "" : "cursor-pointer select-none hover:text-ink"}`}>
                {c.rotulo}{ordKey === c.chave ? (dir === "asc" ? " \u25B2" : " \u25BC") : ""}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {visiveis.map((r, i) => (
              <tr key={r.id ?? i} className="border-t hover:bg-paper">
                {colunas.map((c) => {
                  let conteudo: any;
                  const numerico = c.tipo === "moeda" || c.tipo === "data" || c.tipo === "pct";
                  if (c.acao) {
                    conteudo = (
                      <span className="flex justify-end">
                        <button onClick={() => executarAcao(c, r.id)} disabled={busyId === r.id}
                          className="rounded-md border border-neg px-3 py-1 text-xs text-neg hover:bg-neg hover:text-white disabled:opacity-40">
                          {busyId === r.id ? "\u2026" : c.acao.rotulo}
                        </button>
                      </span>
                    );
                  } else if (c.links) {
                    conteudo = (
                      <span className="flex justify-end gap-3">
                        {c.links.map((l) => (
                          <Link key={l.rotulo} href={l.base + r.id + (l.sufixo || "")} className="text-xs text-muted hover:text-ink">{l.rotulo}</Link>
                        ))}
                      </span>
                    );
                  } else {
                    const val = r[c.chave];
                    const disp = c.tipo === "moeda" ? fmtMoeda(val) : c.tipo === "data" ? fmtData(val) : c.tipo === "pct" ? fmtPct(val) : c.tipo === "status" ? badge(val) : (val ?? "—");
                    conteudo = c.linkBase ? <Link href={c.linkBase + r.id} className="font-medium hover:text-accent">{disp}</Link> : disp;
                  }
                  return <td key={c.chave} className={`px-5 py-3 ${c.align === "right" ? "text-right" : ""} ${numerico ? "num" : ""}`}>{conteudo}</td>;
                })}
              </tr>
            ))}
            {visiveis.length === 0 && <tr><td colSpan={colunas.length} className="px-5 py-6 text-center text-muted">{vazio}</td></tr>}
          </tbody>
        </table>
      </div>
      {ordenadas.length > inicial && (
        <div className="border-t px-5 py-3 text-center">
          <button onClick={() => setTodos((t) => !t)} className="text-sm font-medium text-accent hover:underline">
            {todos ? "Mostrar menos" : `Mostrar todos (${ordenadas.length})`}
          </button>
        </div>
      )}
      {!todos && ordenadas.length > inicial && (
        <div className="px-5 pb-3 text-center text-xs text-muted">mostrando {inicial} de {ordenadas.length} \u2014 clique num cabe\u00e7alho para ordenar</div>
      )}
    </div>
  );
}
