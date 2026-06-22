/**
 * Formatadores pt-BR. Use SEMPRE estes helpers para exibir números —
 * mantém alinhamento tabular e consistência em toda a UI.
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234567.89 -> "R$ 1.234.567,89" */
export const fmtBRL = (v: number) => brl.format(v ?? 0);

/** 1234567 -> "R$ 1,2 mi" (para cards compactos) */
export const fmtBRLCompact = (v: number) => brlCompact.format(v ?? 0);

/** Fração 0.1515 -> "15,15%" */
export const fmtPct = (frac: number, casas = 2) =>
  `${((frac ?? 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;

/** "2026-06-18" -> "18/06/2026" */
export const fmtData = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

/** Inteiro com separador de milhar */
export const fmtNum = (v: number) => (v ?? 0).toLocaleString("pt-BR");
