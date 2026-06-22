/**
 * =====================================================================
 *  CLIENTE BANCO CENTRAL (SGS) — busca do CDI atual
 *
 *  Fonte: API pública do BCB (sem chave, sem cadastro).
 *  Série 4389 = "Taxa de juros - CDI anualizada base 252" (% a.a.)
 *  Série 12   = "Taxa de juros - CDI" (% a.d., diário) — opcional
 *
 *  O BCB retorna a taxa em PERCENTUAL (ex: "15.15") e a data em
 *  "dd/MM/aaaa". Aqui convertemos para o padrão do sistema:
 *  taxa como FRAÇÃO (0.1515) e data ISO (aaaa-MM-dd).
 *
 *  Obs.: em fins de semana/feriados não há divulgação nova — a API
 *  retorna o último dia útil. Por isso usamos /ultimos/1.
 * =====================================================================
 */

const SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
export const SERIE_CDI_ANUAL = 4389; // % a.a. base 252
export const SERIE_CDI_DIARIO = 12; // % a.d.

export interface CdiAtual {
  dataReferencia: string; // ISO: aaaa-MM-dd
  taxaAnual: number; // fração: 0.1515 = 15,15% a.a.
  fonte: "BCB-SGS-4389";
}

interface PontoSGS {
  data: string; // "dd/MM/aaaa"
  valor: string; // percentual como string, ex: "15.15"
}

function dataBrParaIso(dataBr: string): string {
  const [dia, mes, ano] = dataBr.split("/");
  return `${ano}-${mes}-${dia}`;
}

function parseValor(valor: string): number {
  // JSON do BCB usa ponto; trocamos vírgula por segurança
  return Number(valor.replace(",", ".")) / 100;
}

/**
 * Busca o CDI anualizado mais recente (último dia útil divulgado).
 * Lança erro se a API não responder ou vier vazia.
 */
export async function fetchCdiAtual(): Promise<CdiAtual> {
  const url = `${SGS}.${SERIE_CDI_ANUAL}/dados/ultimos/1?formato=json`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Revalida no máximo a cada 6h (Next.js). Ajuste conforme necessário.
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!res.ok) {
    throw new Error(`BCB SGS respondeu ${res.status} ao buscar o CDI`);
  }

  const dados = (await res.json()) as PontoSGS[];
  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error("BCB SGS retornou série de CDI vazia");
  }

  const ultimo = dados[dados.length - 1];
  return {
    dataReferencia: dataBrParaIso(ultimo.data),
    taxaAnual: parseValor(ultimo.valor),
    fonte: "BCB-SGS-4389",
  };
}

/**
 * Busca um intervalo de CDI (para backfill do histórico).
 * datas no formato "dd/MM/aaaa". Intervalo máximo de 10 anos por chamada.
 */
export async function fetchCdiIntervalo(
  dataInicial: string,
  dataFinal: string
): Promise<CdiAtual[]> {
  const [di, mi, yi] = dataInicial.split("/").map(Number);
  const [df, mf, yf] = dataFinal.split("/").map(Number);
  const inicio = new Date(yi, (mi || 1) - 1, di || 1);
  const fim = new Date(yf, (mf || 12) - 1, df || 31);
  const pad = (n: number) => String(n).padStart(2, "0");
  const br = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const out: CdiAtual[] = [];
  let curIni = new Date(inicio);
  while (curIni <= fim) {
    const fimAno = new Date(curIni.getFullYear(), 11, 31);
    const curFim = fimAno < fim ? fimAno : fim;
    const url =
      `${SGS}.${SERIE_CDI_ANUAL}/dados?formato=json` +
      `&dataInicial=${br(curIni)}&dataFinal=${br(curFim)}`;

    let ok = false; let ultimoStatus = 0;
    for (let tent = 0; tent < 3 && !ok; tent++) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (tesouraria)" } });
        if (!res.ok) { ultimoStatus = res.status; await espera(900); continue; }
        const dados = (await res.json()) as PontoSGS[];
        for (const p of dados) out.push({ dataReferencia: dataBrParaIso(p.data), taxaAnual: parseValor(p.valor), fonte: "BCB-SGS-4389" as const });
        ok = true;
      } catch { ultimoStatus = -1; await espera(900); }
    }
    if (!ok) throw new Error(`BCB SGS respondeu ${ultimoStatus} no período ${br(curIni)}–${br(curFim)} — tente um intervalo menor (ex: um ano por vez)`);
    curIni = new Date(curFim.getFullYear() + 1, 0, 1);
  }
  return out;
}

export const SERIE_SELIC_ANUAL = 1178; // Selic anualizada base 252 (% a.a.)

/** Backfill genérico de uma série do SGS (ano a ano, com tentativas). */
export async function fetchSerieIntervalo(
  serie: number, dataInicial: string, dataFinal: string
): Promise<{ dataReferencia: string; taxaAnual: number }[]> {
  const [di, mi, yi] = dataInicial.split("/").map(Number);
  const [df, mf, yf] = dataFinal.split("/").map(Number);
  const inicio = new Date(yi, (mi || 1) - 1, di || 1);
  const fim = new Date(yf, (mf || 12) - 1, df || 31);
  const pad = (n: number) => String(n).padStart(2, "0");
  const br = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const out: { dataReferencia: string; taxaAnual: number }[] = [];
  let curIni = new Date(inicio);
  while (curIni <= fim) {
    const fimAno = new Date(curIni.getFullYear(), 11, 31);
    const curFim = fimAno < fim ? fimAno : fim;
    const url = `${SGS}.${serie}/dados?formato=json&dataInicial=${br(curIni)}&dataFinal=${br(curFim)}`;
    let ok = false; let ultimoStatus = 0;
    for (let tent = 0; tent < 3 && !ok; tent++) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (tesouraria)" } });
        if (!res.ok) { ultimoStatus = res.status; await espera(900); continue; }
        const dados = (await res.json()) as PontoSGS[];
        for (const p of dados) out.push({ dataReferencia: dataBrParaIso(p.data), taxaAnual: parseValor(p.valor) });
        ok = true;
      } catch { ultimoStatus = -1; await espera(900); }
    }
    if (!ok) throw new Error(`BCB SGS (série ${serie}) respondeu ${ultimoStatus} no período ${br(curIni)}–${br(curFim)} — tente um intervalo menor`);
    curIni = new Date(curFim.getFullYear() + 1, 0, 1);
  }
  return out;
}

export const fetchSelicIntervalo = (de: string, ate: string) => fetchSerieIntervalo(SERIE_SELIC_ANUAL, de, ate);
