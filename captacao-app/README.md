# Tesouraria — Gestão de Captações

Console para gestão de investidores, aportes, resgates, rentabilidade,
tributação e **taxa média ponderada de captação**, segregado por empresa
(Fundo 1, Fundo 2, Securitizadora, Contratos) com visão consolidada.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (PostgreSQL)**.
CDI puxado automaticamente da **API pública do Banco Central (SGS, série 4389)**.

---

## Passo a passo (do zero ao ar)

### 1. Supabase
1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, rode `supabase/schema.sql` (cria tabelas, enums,
   auditoria, RLS e views).
3. Rode `supabase/seed.sql` para dados de demonstração (opcional, mas
   recomendado para o dashboard já abrir com números).
4. Em **Project Settings → API**, copie a URL, a `anon key` e a
   `service_role key`.

### 2. Variáveis de ambiente
```bash
cp .env.example .env
```
Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY`. A service role **só existe no servidor** —
nunca a exponha no client.

### 3. Rodar
```bash
npm install
npm run dev
```
Abra http://localhost:3000 → redireciona para `/dashboard`.

### 4. Atualizar o CDI
- Manual: `curl -X POST http://localhost:3000/api/cdi/sync`
- Backfill: `GET /api/cdi/sync?de=01/01/2024&ate=31/12/2025`
- Produção: agende no Vercel Cron (`vercel.json`):
```json
{ "crons": [{ "path": "/api/cdi/sync", "schedule": "0 22 * * 1-5" }] }
```

---

## O que já está pronto

| Área | Onde |
|---|---|
| Banco completo + RLS + auditoria + views | `supabase/schema.sql` |
| Motor financeiro (taxa efetiva, IR, taxa média, custo) | `lib/funding-engine.ts` |
| Integração CDI (Banco Central / SGS) | `lib/bcb.ts` + `app/api/cdi/*` |
| Cálculo do dashboard (engine + dados) | `lib/dashboard.ts` |
| Dashboard executivo (taxa média, custo, por empresa) | `app/(app)/dashboard` |
| Cadastro de investidores | `app/(app)/investidores` |
| Registro de aportes (adapta-se à modalidade) | `app/(app)/aportes` |

## Próximos passos (roadmap)

1. **Autenticação** — login Supabase + middleware; trocar a service role
   por cliente com sessão (`lib/supabase/server.ts`) nas leituras, deixando
   a service role só para jobs. As políticas RLS já estão no schema.
2. **Resgates** — tela e API (`parcial`, `total`, `apenas_juros`, `cotas`)
   com cálculo de IR via `calcularTributacao()` e prévia do líquido.
3. **Job de snapshot diário** — grava `posicao_snapshots` e alimenta as
   views `vw_taxa_media_*` (histórico auditável).
4. **Relatórios PDF/Excel/CSV** — investidor, empresa, consolidado.
5. **Dashboard de endividamento** — prazo médio, concentração por investidor.
6. **Projeção de custo** — `projetarCusto()` com cenários 30/90/180/365d.

---

## Notas importantes

- **Tributação configurável**: Contrato de Mútuo está como IR isento
  (`instrumentos_financeiros.isento_ir`). FIDC está como 15% fixo conforme
  especificação. Ambos merecem validação contábil/jurídica — a tabela
  regressiva e o come-cotas reais são tratados como melhoria futura.
- **Dias úteis**: a contagem em `funding-engine.ts` exclui fins de semana,
  mas **não** feriados. Para produção, plugue o calendário ANBIMA.
- Sem autenticação ainda: as rotas usam a service role no servidor. Não
  publique como está sem implementar o passo 1 do roadmap.
