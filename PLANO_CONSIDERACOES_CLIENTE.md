# Plano — Implementação das considerações do cliente (ConsideracoesCliente.md)

## Contexto

`ConsideracoesCliente.md` traz 8 observações de um cliente real usando o sistema Dezem. Cada uma foi confrontada com o código atual (via exploração + leitura direta + inspeção do banco local) e aprovada individualmente com o usuário. Resultado:

- **6 itens aprovados** para implementação (1, 2, 3, 4, 6, 8).
- **1 item (5 — Contas a Receber)** aprovado como módulo novo completo, incluído nesta rodada apesar do escopo grande.
- **1 item (7 — categoria de custo)** não teve bug confirmado no código (a soma de custo por caminhão não filtra por categoria — já deveria funcionar). Vira apenas um passo de **validação com o cliente**, sem código nesta rodada.

Ordem de implementação recomendada: itens rápidos e isolados primeiro (1, 2+3+4 juntos — mesmo bloco de código), depois item 6 (somente leitura, zero risco), depois item 8, e item 5 por último (maior escopo, mexe em módulo de trips).

---

## Item 1 — Combustível: bloqueio de "Km anterior"

**Problema**: `src/main/modules/fuel/fuel.handlers.ts:51-63` valida odômetro contra `MAX(odometer_at_service)` GLOBAL do caminhão, ignorando data. Bloqueia lançar vale retroativo (esquecido) mesmo sendo cronologicamente anterior a registros já existentes.

**Mudança**: trocar validação para comparar com o registro **anterior por data** (não o máximo global):
- Buscar registro anterior: `WHERE truck_id = ? AND date < ?` (ou mesma data com id menor) `ORDER BY date DESC, id DESC LIMIT 1` → novo odômetro deve ser MAIOR que esse.
- Buscar próximo registro (se existir): `WHERE truck_id = ? AND date > ? ORDER BY date ASC, id ASC LIMIT 1` → novo odômetro deve ser MENOR que esse (mantém coerência cronológica pra cálculo de consumo futuro).
- **Correção complementar obrigatória**: `recalcTruckOdometer` também usa MAX global — deve virar `ORDER BY date DESC, id DESC LIMIT 1`, senão `trucks.current_odometer` pode divergir do km real mais recente assim que passarmos a permitir lançamentos fora de ordem.

Arquivo: `src/main/modules/fuel/fuel.handlers.ts`. Sem mudança de schema/tabela.

**Edge case conhecido**: dois registros na mesma data pro mesmo caminhão — desempate por `id` (ordem de inserção). Documentar como limitação conhecida.

---

## Itens 2+3+4 — PDF de Lançamentos (Trips.tsx): bilhete, totais, ocultar comissão/imposto

Todos convergem no mesmo bloco de exportação PDF em `src/renderer/src/pages/Trips.tsx` (handler `onSecondaryAction`, linhas ~417-509) — implementar juntos pra evitar conflito de sequenciamento.

**Item 2 — Bilhete ausente**: adicionar `'Bilhete'` ao array `headers` (mesma posição da tabela em tela) e `trip.ticket_number ?? '—'` na linha de dados correspondente.

**Item 4 — Ocultar Imposto/Comissão quando filtrado por cliente**: quando `filters.customer_id` estiver ativo, essas colunas somem do PDF (headers + data). Sem filtro de cliente, comportamento atual se mantém.

```ts
const isCustomerScoped = !!filters.customer_id
const baseHeaders = ['Data', 'Bilhete', 'Caminhão', 'Motorista', 'Produto', 'Peso', 'Km', 'Valor']
const headers = isCustomerScoped
  ? [...baseHeaders, 'Cliente']
  : [...baseHeaders, 'Imposto', 'Comissão', 'Cliente']
```

**Item 3 — Linha de totais**: estender `src/renderer/src/lib/pdfGenerator.ts` (`PdfOptions`) com `foot?: (string|number)[][]`, repassar pro `autoTable` com `footStyles`. Em `Trips.tsx`, somar sobre o array `trips` já filtrado (Peso, Km, Valor, e Imposto/Comissão quando presentes) e montar `footRow` alinhado ao `headers` escolhido no item 4 — colunas não numéricas recebem `'TOTAL'`/`'—'`.

Recomendação: extrair um helper local em `Trips.tsx` (ex. `buildTripsPdfColumns(trips, isCustomerScoped)`) retornando `{ headers, data, foot }` pra manter os 3 itens coesos.

**Pergunta em aberto**: regra "ocultar quando `customer_id` ativo" foi a aprovada — se no futuro precisar de um botão explícito "Exportar para Cliente" separado do filtro, revisar.

---

## Item 6 — Comissão por motorista/mês (relatório, somente leitura)

**Objetivo**: saber quanto pagar de comissão a cada motorista no mês — hoje só existe `commission_value` por viagem, sem soma.

**Restrição importante**: comissão já entra na rentabilidade por caminhão via subquery em `dashboard.handlers.ts:231-236`. Este relatório deve ser **só leitura/agregação** — NUNCA criar linha em `costs` (diferente do padrão de salário em `issueMonthlySalaries`), senão duplica custo na rentabilidade.

**Novo handler** em `src/main/modules/dashboard/dashboard.handlers.ts` (`dashboard:commissionByDriver`):
```sql
SELECT d.id, d.name, COALESCE(SUM(tr.commission_value),0) as total_commission, COUNT(tr.id) as trip_count
FROM trips tr JOIN drivers d ON tr.driver_id = d.id
WHERE tr.has_commission = 1 AND tr.date BETWEEN ? AND ?
GROUP BY d.id ORDER BY total_commission DESC
```
Não filtrar por `is_outsourced` aqui (diferente do resumo de rentabilidade) — motorista terceirizado também pode ter comissão a receber.

**UI**: nova aba "Comissões" em `src/renderer/src/pages/Costs.tsx` (mesmo padrão de abas existente entre `costs`/`fuel`), tabela somente leitura (motorista, nº viagens, total comissão) com filtro de período.

**Arquivos**: `dashboard.handlers.ts` (handler), `src/preload/index.ts` (`dashboard.commissionByDriver`), `src/renderer/src/lib/types.ts` (tipo + assinatura em `Window.api`), `Costs.tsx` (nova aba).

---

## Item 8 — Custos parcelados

**Objetivo**: lançar valor total (ex. R$10.000 em 10x) e sistema gerar as parcelas futuras automaticamente (dia de vencimento fixo).

**Migração** (`src/main/database.ts`, padrão `ALTER TABLE` existente): adicionar em `costs` — `installment_group_id TEXT DEFAULT NULL`, `installment_number INTEGER DEFAULT NULL`, `installment_total INTEGER DEFAULT NULL` + índice em `installment_group_id`. Nullable, sem backfill necessário (registros antigos = fora de grupo).

**Schema** (`src/shared/schemas.ts`): estender `costSchema` com `installments` opcional (`min(1).max(360)`, default 1). Documentar que `value` vira "valor total" quando `installments > 1`.

**Handler** (`src/main/modules/costs/costs.handlers.ts`): branch dentro de `costs:create` — se `installments > 1`, gerar `installment_group_id` (uuid via `node:crypto`), calcular valor por parcela (`Math.floor(total/n * 100)/100`, ajustando resto na última parcela pra bater a soma exata), inserir N linhas em transaction, data de cada parcela = data base + (i-1) meses (mantendo dia do mês, com clamp em meses mais curtos).

**Decisão v1**: editar/excluir uma parcela afeta só aquela linha (não o grupo inteiro) — mais simples, menor risco. UI mostra "Parcela X/N" só como indicação visual.

**Frontend** (`Costs.tsx`): toggle "Parcelar" no formulário de custo → mostra "Número de parcelas", relabela "Valor" pra "Valor total" e "Data" pra "Data da 1ª parcela". Envio continua via `costs:create` (branch é no backend). Tabela de custos mostra badge "Parcela X/N" quando `installment_group_id` setado.

**Tipos**: `src/renderer/src/lib/types.ts` — `Cost` ganha `installment_group_id?`, `installment_number?`, `installment_total?`.

---

## Item 5 — NEW: Lançamento → Contas a Receber

Módulo novo do zero. Maior escopo — feito por último.

### Perguntas em aberto (confirmar antes/durante implementação)
1. **Valor do recebível**: `price_charged` bruto (recomendado — já que item 4 estabelece que imposto/comissão são internos, o cliente paga o valor cheio) ou líquido? → **default: bruto**.
2. **Vencimento**: cliente não especificou prazo. → **default v1: sem due_date (nullable)**, saldo aberto corrido por cliente.
3. **Baixa parcial**: só baixa integral (selecionar N itens abertos, marcar todos pagos) ou paga valor parcial de um item? → **default v1: só baixa integral** (mais simples).
4. **Edição de viagem já paga**: se trip mudar valor/cliente depois do recebível já marcado `'paid'`, sincroniza ou ignora? → **default: só sincroniza enquanto `status='open'`**; recebível pago não é tocado por edição da viagem (evita reabrir cobrança já recebida, mas pode divergir do valor atual da viagem).
5. **Exclusão de viagem paga**: cascata sempre apaga o recebível, ou bloqueia/impede exclusão da viagem se já `'paid'`? → precisa decisão explícita (integridade de registro financeiro).

### Schema (nova tabela, `database.ts`)
```sql
CREATE TABLE IF NOT EXISTS receivables (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id      INTEGER NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES customers(id),
  amount       REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid')),
  due_date     TEXT DEFAULT NULL,
  paid_date    TEXT DEFAULT NULL,
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
```
`trip_id UNIQUE` + `ON DELETE CASCADE` dá sincronia 1:1 e limpeza automática quando a viagem é excluída (cobre o caso "open" da pergunta 5; caso "paid" precisa guard de app — ver pergunta 5).

**Backfill idempotente** (viagens já existentes sem recebível):
```sql
INSERT INTO receivables (trip_id, customer_id, amount, status, created_at)
SELECT id, customer_id, price_charged, 'open', created_at FROM trips
WHERE id NOT IN (SELECT trip_id FROM receivables)
```

### Sincronia com trips (espelha padrão de `trip_fuel_stops`)
Em `src/main/modules/trips/trips.handlers.ts` (mesmo arquivo, mesmas transactions já existentes — `trips:create` linhas ~108-148, `trips:update` linhas ~166-208):
- **create**: após inserir a viagem, inserir `receivables` (`status='open'`).
- **update**: `UPDATE receivables SET customer_id=?, amount=? WHERE trip_id=? AND status='open'` (só sincroniza se ainda aberto — pergunta 4).
- **delete**: cascade cuida do caso aberto; caso pago precisa guard explícito (pergunta 5).

### Novo módulo de handlers
`src/main/modules/receivables/receivables.handlers.ts` (novo arquivo), registrado em `src/main/index.ts` via `registerReceivablesHandlers()`:
- `receivables:list` — filtros `customer_id`/`status`, join com `trips` (bilhete, data) e `customers` (nome).
- `receivables:markPaid` — recebe array de ids + `paid_date`, baixa em lote (`UPDATE ... WHERE id IN (...) AND status='open'`).
- `receivables:summaryByCustomer` — agregação pros cards de estatística.

### Schema/tipos/preload
- `src/shared/schemas.ts`: `receivablesMarkPaidSchema` (array de ids + paid_date).
- `src/renderer/src/lib/types.ts`: interface `Receivable` + entrada `receivables` no `Window.api`.
- `src/preload/index.ts`: namespace `receivables` (list, markPaid, summaryByCustomer).

### Página nova
`src/renderer/src/pages/Receivables.tsx`, seguindo padrão de "Master Data Page" do CLAUDE.md: cards de estatística (total aberto, contagem), filtro por cliente/status, tabela com seleção múltipla, ação "Dar baixa" com modal de confirmação. Reusa `PageHeader`, `Table`, `Modal`, `ConfirmModal`, `formatBRL` já existentes.

### Roteamento
- `src/renderer/src/App.tsx` — rota `/receivables`.
- `src/renderer/src/components/Sidebar.tsx` — item de navegação "Contas a Receber".
- `src/main/index.ts` — registrar `registerReceivablesHandlers()`.

---

## Item 7 — Categoria de custo x rentabilidade (SEM código nesta rodada)

Investigação no código (`dashboard.handlers.ts:222-225`) mostra que a soma de custo por caminhão **não filtra por categoria** — qualquer custo com `truck_id` preenchido já entra na rentabilidade, categoria nova ou não. Inspeção do banco local (dev/teste) não tinha nenhuma categoria custom cadastrada, então não deu pra reproduzir com dado real.

**Ação**: nenhuma mudança de código agora. Próximo passo é **validar com o cliente**: confirmar categoria específica usada, se o custo tinha caminhão vinculado, e em qual tela ele está checando "rentabilidade" — antes de decidir se é bug real ou uso incorreto (custo sem vínculo de caminhão nunca aparece em rentabilidade de veículo nenhum, isso vale pra qualquer categoria).

---

## Verificação

- `npm run type-check` após cada item (principalmente 5, 6, 8 que mexem em tipos/schemas).
- `npm run lint` antes de commit.
- Testar manualmente no app (`npm run dev`):
  - Item 1: lançar vale de combustível com data/km anterior a um já existente — deve aceitar se coerente, rejeitar se quebra ordem cronológica.
  - Itens 2/3/4: exportar PDF de Lançamentos sem filtro (deve ter Imposto/Comissão + totais) e com filtro de cliente (sem Imposto/Comissão, com totais, com Bilhete).
  - Item 6: conferir soma de comissão por motorista bate com soma manual das viagens do período.
  - Item 8: lançar custo parcelado (ex. 10.000 em 10x) — conferir 10 linhas geradas, datas mensais corretas, soma exata do total.
  - Item 5: criar viagem → conferir recebível criado; editar viagem aberta → recebível atualiza; dar baixa → status muda; excluir viagem paga → validar comportamento decidido na pergunta 5.
