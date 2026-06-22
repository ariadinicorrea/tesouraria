/**
 * =====================================================================
 *  MOTOR DE CÁLCULO FINANCEIRO — Gestão de Captações
 *  Funções puras, sem dependência de framework (testáveis e reutilizáveis
 *  em API routes do Next.js, jobs de snapshot ou geração de relatórios).
 *
 *  CONVENÇÕES (mesmas do banco):
 *   - Taxas em fração decimal: 0.012 = 1,20% ; 0.1065 = 10,65%
 *   - Base de dias úteis = 252 (padrão B3/ANBIMA para DI)
 *   - percentual_cdi como múltiplo: 1.10 = 110% do CDI
 * =====================================================================
 */

export const DIAS_UTEIS_ANO = 252;
export const MESES_ANO = 12;

export type TipoRemuneracao = "fixa" | "cdi_mais" | "selic_mais" | "percentual_cdi";
export type PeriodoTaxa = "mensal" | "anual";
export type RegimeTributario = "fixo_15" | "regressivo" | "isento";

export interface ParametrosRemuneracao {
  tipo: TipoRemuneracao;
  taxaValor?: number; // 'fixa' e 'cdi_mais'
  periodo?: PeriodoTaxa; // 'fixa' e 'cdi_mais'
  percentualCdi?: number; // 'percentual_cdi' (1.10 = 110%)
}

/* ---------------------------------------------------------------------
 *  1) TAXA EFETIVA ANUAL
 *  Normaliza qualquer modalidade para uma taxa anual comparável (base 252),
 *  usada na ponderação da taxa média e no custo de captação.
 * ------------------------------------------------------------------- */
export function taxaEfetivaAnual(
  params: ParametrosRemuneracao,
  cdiAnual: number
): number {
  switch (params.tipo) {
    case "fixa": {
      const t = params.taxaValor ?? 0;
      return params.periodo === "mensal" ? Math.pow(1 + t, MESES_ANO) - 1 : t;
    }
    case "cdi_mais":
    case "selic_mais": {
      // Spread informado; convertido para anual e composto sobre o índice (CDI ou Selic).
      const spread =
        params.periodo === "mensal"
          ? Math.pow(1 + (params.taxaValor ?? 0), MESES_ANO) - 1
          : params.taxaValor ?? 0;
      return (1 + cdiAnual) * (1 + spread) - 1;
    }
    case "percentual_cdi": {
      // Convenção ANBIMA: aplica-se o percentual sobre a taxa DI diária.
      const p = params.percentualCdi ?? 1;
      const diDiario = Math.pow(1 + cdiAnual, 1 / DIAS_UTEIS_ANO) - 1;
      const efDiario = diDiario * p;
      return Math.pow(1 + efDiario, DIAS_UTEIS_ANO) - 1;
    }
  }
}

/* Conversões auxiliares entre bases */
export const anualParaMensal = (a: number) =>
  Math.pow(1 + a, 1 / MESES_ANO) - 1;
export const anualParaDiario = (a: number) =>
  Math.pow(1 + a, 1 / DIAS_UTEIS_ANO) - 1;

/* ---------------------------------------------------------------------
 *  2) ACCRUAL DE SALDO  (Securitizadora e Contratos — base saldo)
 *  Compõe o principal pela taxa efetiva ao longo dos dias úteis.
 *  NOTA: para produção, dias úteis devem usar o calendário de feriados
 *  ANBIMA (ver contarDiasUteis abaixo, versão simplificada).
 * ------------------------------------------------------------------- */
export function saldoBrutoAtualizado(
  principal: number,
  taxaEfetivaAnual: number,
  diasUteis: number
): number {
  return principal * Math.pow(1 + taxaEfetivaAnual, diasUteis / DIAS_UTEIS_ANO);
}

export function rendimentoBruto(
  principal: number,
  taxaEfetivaAnual: number,
  diasUteis: number
): number {
  return saldoBrutoAtualizado(principal, taxaEfetivaAnual, diasUteis) - principal;
}

/* ---------------------------------------------------------------------
 *  3) VALORIZAÇÃO DE COTAS  (FIDC)
 * ------------------------------------------------------------------- */
export interface PosicaoCotas {
  patrimonioBruto: number;
  rendimentoBruto: number;
  rentabilidadeAcumulada: number; // fração (0.08 = 8%)
}

export function posicaoCotasFIDC(
  quantidadeCotas: number,
  valorCotaAporte: number,
  valorCotaAtual: number
): PosicaoCotas {
  const patrimonioBruto = quantidadeCotas * valorCotaAtual;
  const investido = quantidadeCotas * valorCotaAporte;
  return {
    patrimonioBruto,
    rendimentoBruto: patrimonioBruto - investido,
    rentabilidadeAcumulada:
      valorCotaAporte > 0 ? valorCotaAtual / valorCotaAporte - 1 : 0,
  };
}

/* ---------------------------------------------------------------------
 *  4) TRIBUTAÇÃO
 *   - fixo_15    -> 15% (Fundos, conforme especificação)
 *   - regressivo -> tabela por prazo (Securitizadora)
 *   - isento     -> Contrato de Mútuo / empresa "Contratos" -> IR = 0
 *  Observação técnica: a tributação de FIDC no mundo real envolve
 *  come-cotas e tabela regressiva; o "fixo_15" reflete a regra pedida.
 * ------------------------------------------------------------------- */
export function aliquotaRegressiva(prazoDias: number): number {
  if (prazoDias <= 180) return 0.225;
  if (prazoDias <= 360) return 0.2;
  if (prazoDias <= 720) return 0.175;
  return 0.15;
}

export interface ResultadoTributacao {
  aliquota: number;
  irRetido: number;
  valorLiquido: number;
}

export function calcularTributacao(
  regime: RegimeTributario,
  rendimento: number,
  prazoDias: number
): ResultadoTributacao {
  if (regime === "isento" || rendimento <= 0) {
    return { aliquota: 0, irRetido: 0, valorLiquido: Math.max(rendimento, 0) };
  }
  const aliquota =
    regime === "fixo_15" ? 0.15 : aliquotaRegressiva(prazoDias);
  const irRetido = rendimento * aliquota;
  return { aliquota, irRetido, valorLiquido: rendimento - irRetido };
}

/* ---------------------------------------------------------------------
 *  5) TAXA MÉDIA PONDERADA DE CAPTAÇÃO
 *  Taxa Média = Σ(Saldo Atualizado × Taxa Efetiva) ÷ Σ(Saldo Atualizado)
 * ------------------------------------------------------------------- */
export interface PosicaoPonderavel {
  saldoBruto: number;
  taxaEfetivaAnual: number;
}

export interface TaxaMedia {
  anual: number;
  mensal: number;
  diaria: number;
  saldoTotal: number;
}

export function taxaMediaPonderada(posicoes: PosicaoPonderavel[]): TaxaMedia {
  const saldoTotal = posicoes.reduce((s, p) => s + p.saldoBruto, 0);
  const ponderado = posicoes.reduce(
    (s, p) => s + p.saldoBruto * p.taxaEfetivaAnual,
    0
  );
  const anual = saldoTotal > 0 ? ponderado / saldoTotal : 0;
  return {
    anual,
    mensal: anualParaMensal(anual),
    diaria: anualParaDiario(anual),
    saldoTotal,
  };
}

/* ---------------------------------------------------------------------
 *  6) CUSTO DE CAPTAÇÃO  (diário / mensal / anual)
 *  Quanto custa, em R$, remunerar um saldo a uma taxa.
 * ------------------------------------------------------------------- */
export interface CustoCaptacao {
  diario: number;
  mensal: number;
  anual: number;
}

export function custoCaptacao(
  saldo: number,
  taxaEfetivaAnual: number
): CustoCaptacao {
  return {
    diario: saldo * anualParaDiario(taxaEfetivaAnual),
    mensal: saldo * anualParaMensal(taxaEfetivaAnual),
    anual: saldo * taxaEfetivaAnual,
  };
}

/** Custo de uma carteira inteira (soma posição a posição). */
export function custoCaptacaoCarteira(
  posicoes: PosicaoPonderavel[]
): CustoCaptacao {
  return posicoes.reduce<CustoCaptacao>(
    (acc, p) => {
      const c = custoCaptacao(p.saldoBruto, p.taxaEfetivaAnual);
      return {
        diario: acc.diario + c.diario,
        mensal: acc.mensal + c.mensal,
        anual: acc.anual + c.anual,
      };
    },
    { diario: 0, mensal: 0, anual: 0 }
  );
}

/* ---------------------------------------------------------------------
 *  7) PROJEÇÃO DE CUSTO FUTURO
 *  Projeta o saldo bruto da carteira em horizontes (30/90/180/365 dias
 *  corridos -> convertidos para dias úteis aprox. por fator 252/365),
 *  considerando eventos de aporte e resgate informados.
 * ------------------------------------------------------------------- */
export interface EventoFluxo {
  diaCorrido: number; // offset a partir de hoje
  valor: number; // positivo = aporte, negativo = resgate
  taxaEfetivaAnual: number;
}

export interface ProjecaoPonto {
  horizonteDias: number;
  saldoProjetado: number;
  custoAcumulado: number;
}

export function projetarCusto(
  posicoesAtuais: PosicaoPonderavel[],
  eventos: EventoFluxo[],
  horizontes: number[] = [30, 90, 180, 365]
): ProjecaoPonto[] {
  const fatorUteis = DIAS_UTEIS_ANO / 365;
  return horizontes.map((h) => {
    const diasUteis = h * fatorUteis;

    let saldo = posicoesAtuais.reduce(
      (s, p) =>
        s + saldoBrutoAtualizado(p.saldoBruto, p.taxaEfetivaAnual, diasUteis),
      0
    );

    for (const ev of eventos) {
      if (ev.diaCorrido > h) continue;
      const diasRestUteis = (h - ev.diaCorrido) * fatorUteis;
      saldo += saldoBrutoAtualizado(
        ev.valor,
        ev.taxaEfetivaAnual,
        diasRestUteis
      );
    }

    const saldoHoje =
      posicoesAtuais.reduce((s, p) => s + p.saldoBruto, 0) +
      eventos.filter((e) => e.diaCorrido <= h).reduce((s, e) => s + e.valor, 0);

    return {
      horizonteDias: h,
      saldoProjetado: saldo,
      custoAcumulado: saldo - saldoHoje,
    };
  });
}

/* ---------------------------------------------------------------------
 *  8) CONTAGEM DE DIAS ÚTEIS  (versão simplificada — exclui fins de semana)
 *  Em produção, substituir pelo calendário de feriados ANBIMA.
 * ------------------------------------------------------------------- */
export function contarDiasUteis(inicio: Date, fim: Date): number {
  let dias = 0;
  const d = new Date(inicio);
  while (d < fim) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) dias++;
  }
  return dias;
}

/* ---------------------------------------------------------------------
 *  IOF regressivo sobre o rendimento (resgates com menos de 30 dias).
 *  Dia 1 = 96% ... dia 29 = 3% ... dia 30+ = 0%. Tabela oficial.
 * ------------------------------------------------------------------- */
const IOF_TABELA = [96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3];
export function iofAliquota(dias: number): number {
  if (dias >= 30) return 0;
  if (dias < 1) return 0.96;
  return (IOF_TABELA[dias - 1] ?? 0) / 100;
}

/* ---------------------------------------------------------------------
 *  ACÚMULO DIA A DIA (CDI histórico)
 *  Fator diário conforme a modalidade, usando o CDI de cada dia.
 *  Como a série do BCB (4389) só tem dias úteis, acumular por entrada
 *  da série respeita o calendário da B3 (já exclui feriados).
 * ------------------------------------------------------------------- */
export function fatorDiarioRemuneracao(params: ParametrosRemuneracao, cdiAnual: number): number {
  switch (params.tipo) {
    case "fixa": {
      const anual = params.periodo === "mensal" ? Math.pow(1 + (params.taxaValor ?? 0), MESES_ANO) - 1 : (params.taxaValor ?? 0);
      return Math.pow(1 + anual, 1 / DIAS_UTEIS_ANO);
    }
    case "cdi_mais":
    case "selic_mais": {
      const spread = params.periodo === "mensal" ? Math.pow(1 + (params.taxaValor ?? 0), MESES_ANO) - 1 : (params.taxaValor ?? 0);
      return Math.pow(1 + cdiAnual, 1 / DIAS_UTEIS_ANO) * Math.pow(1 + spread, 1 / DIAS_UTEIS_ANO);
    }
    case "percentual_cdi": {
      const p = params.percentualCdi ?? 1;
      const diDiario = Math.pow(1 + cdiAnual, 1 / DIAS_UTEIS_ANO) - 1;
      return 1 + diDiario * p;
    }
  }
}

export interface PontoCdi { data: string; taxa: number; } // data ISO, taxa fração

/**
 * Saldo bruto acumulando o CDI dia a dia.
 * serieAsc: pontos de CDI ordenados por data (asc). Acumula os pontos com data > dataAporte.
 * Se não houver histórico suficiente, cai no método antigo (CDI atual constante).
 */
export function saldoBrutoHistorico(
  valorAporte: number, params: ParametrosRemuneracao, dataAporteIso: string,
  serieAsc: PontoCdi[], cdiAtual: number, diasUteisFallback: number
): number {
  const relevantes = serieAsc.filter((p) => p.data > dataAporteIso);
  if (relevantes.length === 0) {
    return saldoBrutoAtualizado(valorAporte, taxaEfetivaAnual(params, cdiAtual), diasUteisFallback);
  }
  let fator = 1;
  for (const p of relevantes) fator *= fatorDiarioRemuneracao(params, p.taxa);
  return valorAporte * fator;
}
