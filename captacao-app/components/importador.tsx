"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TIPOS = [
  { v: "investidores", l: "Investidores", tpl: "/templates/investidores.csv" },
  { v: "agentes", l: "Captadores / Agentes", tpl: "/templates/agentes.csv" },
  { v: "aportes", l: "Aportes", tpl: "/templates/aportes.csv" },
  { v: "resgates", l: "Resgates", tpl: "/templates/resgates.csv" },
];

export function Importador() {
  const router = useRouter();
  const [tipo, setTipo] = useState("investidores");
  const [texto, setTexto] = useState("");
  const [nomeArq, setNomeArq] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const tplAtual = TIPOS.find((t) => t.v === tipo)!.tpl;

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null); setRes(null);
    const f = e.target.files?.[0]; if (!f) return;
    setNomeArq(f.name);
    const reader = new FileReader();
    reader.onload = () => setTexto(reader.result as string);
    reader.readAsText(f, "utf-8");
  }
  async function importar() {
    if (!texto.trim()) { setErro("Escolha um arquivo CSV primeiro."); return; }
    setBusy(true); setErro(null); setRes(null);
    const r = await fetch("/api/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, texto }) });
    const j = await r.json(); setBusy(false);
    if (!j.ok) return setErro(j.erro);
    setRes(j); router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-lg border bg-surface p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="eyebrow">O que você vai importar?</label>
            <select className="mt-1 w-full rounded-md border bg-paper px-3 py-2 text-sm" value={tipo} onChange={(e) => { setTipo(e.target.value); setRes(null); setTexto(""); setNomeArq(""); }}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <a href={tplAtual} download className="rounded-md border px-4 py-2 text-sm hover:bg-paper">⬇ Baixar template ({TIPOS.find((t) => t.v === tipo)!.l})</a>
          </div>
        </div>

        <ol className="mt-4 space-y-1 text-sm text-muted">
          <li>1. Baixe o template, abra no Excel e preencha (não apague a primeira linha de títulos).</li>
          <li>2. No Excel: <b>Arquivo → Salvar como → CSV (separado por ponto e vírgula)</b>.</li>
          <li>3. Escolha o arquivo aqui embaixo e clique em Importar.</li>
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,.txt" onChange={escolher} className="text-sm" />
          <button onClick={importar} disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Importando…" : "Importar"}</button>
          {nomeArq && <span className="text-xs text-muted">{nomeArq}</span>}
        </div>
        {erro && <p className="mt-3 text-sm text-neg">{erro}</p>}
      </div>

      {res && (
        <div className="mt-4 rounded-lg border bg-surface p-5">
          <div className="text-sm"><b className="text-accent">{res.inseridos}</b> de {res.total} linha(s) importada(s) com sucesso.</div>
          {res.erros?.length > 0 && (
            <div className="mt-3">
              <div className="eyebrow text-warn">{res.erros.length} linha(s) com problema</div>
              <ul className="mt-2 space-y-1 text-sm">
                {res.erros.slice(0, 30).map((e: any, i: number) => (
                  <li key={i} className="text-muted">Linha {e.linha}: <span className="text-neg">{e.motivo}</span></li>
                ))}
              </ul>
              {res.erros.length > 30 && <p className="mt-1 text-xs text-muted">… e mais {res.erros.length - 30}.</p>}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Dica: corrija as linhas com problema no Excel e importe só elas de novo. Investidores/agentes duplicados (mesmo documento) podem dar erro de duplicidade — isso é esperado.</p>
        </div>
      )}

      {tipo === "resgates" && (
        <p className="mt-4 text-xs text-muted">Para resgates: o aporte é localizado pelo <b>documento do investidor</b> + <b>empresa</b>. Se o investidor tiver mais de um aporte ativo na mesma empresa, preencha a <b>data_aporte</b>. Tipos: <b>total</b>, <b>parcial</b> (use valor_principal/valor_juros) ou <b>apenas_juros</b>. O sistema calcula IR e IOF automaticamente, com o saldo na data de hoje.</p>
      )}
      {tipo === "aportes" && (
        <p className="mt-4 text-xs text-muted">Para aportes: os <b>investidores</b>, <b>empresas</b> e <b>instrumentos</b> precisam já existir (importe os investidores primeiro). O sistema liga pelo <b>documento do investidor</b> e pelo <b>nome exato</b> da empresa e do instrumento.</p>
      )}
    </div>
  );
}
