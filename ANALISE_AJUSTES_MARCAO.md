# Ajustes pedidos pelo Marcão — análise item a item

## Contexto

Marcão (usuário do sistema) levantou 14 pontos de atrito/bugs/pedidos após uso real do
Dezem. Cada item foi investigado no código (3 exploradores em paralelo cobrindo
relatórios/CPK, tela de lançamentos/produto, e custos/despesas/terceiros) antes de propor
fix. Usuário pediu análise individual de cada item — não um plano único de implementação —
para poder aprovar/priorizar um por um. Este documento é essa análise: causa raiz +
proposta de fix por item, sem ordem de execução implícita.

Decisões já confirmadas com o usuário nesta conversa:
- **CPK** = custo de combustível / km (mantém "custo por km", troca só o numerador de
  "custo total" pra "custo de combustível").
- **Custo vs Despesa** entra no escopo (não foi descartado, apesar do próprio Marcão ter
  questionado se foge da proposta do sistema).
- **"Terceiros sumiu"** é sobre `is_outsourced` (caminhão/motorista terceirizado) — hoje
  esse tipo de viagem entra em receita mas não em custo; ajustar pra também não contar
  como receita.

---

## 1. Ordem da data nos relatórios (crescente, dia 01 primeiro)

**Causa raiz:** `src/main/modules/trips/trips.handlers.ts:77` — `ORDER BY t.date DESC`
no handler `trips:list`. Esse mesmo array alimenta tela e PDF (`Trips.tsx:484`, função
`handleGenerateExport`), sem reordenar depois.

**Proposta:** trocar para `ORDER BY t.date ASC`. Como afeta tela e PDF igualmente
(mesma fonte de dados), confirmar que isso é aceitável pra tela também — se Marcão quiser
ordem diferente na tela (mais recente primeiro) e crescente só no PDF, o sort tem que
sair do SQL e entrar em `handleGenerateExport` (ordenando uma cópia do array antes de
montar `data`).

---

## 2. Condensar relatório (separador "----------" em vez de espaço)

**Causa raiz:** `src/renderer/src/lib/pdfGenerator.ts:41-67`, `autoTable` sem
`cellPadding` customizado → usa o padrão da lib (`cellPadding: 5`), que com
`fontSize: 8` gera a sensação de linha muito espaçada. Não é quebra de linha literal.

**Proposta:** reduzir `styles.cellPadding` (ex. `{ top: 1.5, bottom: 1.5, left: 2, right: 2 }`).
Um separador `----------` de verdade entre linhas não é como `autoTable` funciona
nativamente — exigiria desenhar manualmente via hook `didDrawCell`, mais trabalho pra um
efeito visual que o `cellPadding` reduzido + `theme: 'grid'` (linhas horizontais finas)
já resolve de forma mais limpa. Recomendo: primeiro tentar só reduzir padding e trocar
zebra-striping por `theme: 'grid'`; só desenhar separador manual se ainda ficar "solto"
visualmente.

Afeta também `Customers.tsx` e `PriceManagement.tsx`, que reusam `generatePdf` — mudança
de padding é global a todos os relatórios PDF, o que é desejável (consistência).

---

## 3. Corrigir cálculo de CPK

**Causa raiz:**
- Backend por caminhão: `dashboard.handlers.ts:326` — `cpk: km > 0 ? t.cost / km : null`,
  onde `t.cost` (linhas 258-283) é custo **total** (custos gerais + combustível de viagem
  + combustível avulso + comissão + imposto).
- Frontend frota: `Dashboard.tsx:139` — `summary.cost / summary.totalKm`, mesmo problema.

**Proposta (fórmula confirmada: custo combustível / km):**
- Backend: isolar `fuelCost = trip_fuel_stops (linhas ~262-266) + fuel_records (linhas ~273-276)`
  por caminhão, e calcular `cpk: km > 0 ? fuelCost / km : null` em vez de `t.cost / km`.
- Frontend: mesma troca em `Dashboard.tsx:139`, usando o total de combustível da frota em
  vez de `summary.cost`.
- `km` continua vindo da diferença de odômetro (`fuel_records.odometer_at_service`),
  já é a fonte correta e não muda.
- Rótulo na UI ("Custo Médio / KM") deve virar algo como "CPK (Combustível)" pra não
  confundir com custo operacional total por km — vale manter as duas métricas visíveis
  se fizer sentido pro Marcão (CPK combustível + custo operacional/km separado), a
  confirmar.

---

## 4. Custo vs Despesa (módulo financeiro)

**Escopo:** separar "Custo" (gasto de operação: combustível, motorista, manutenção,
imposto) de "Despesa" (gasto administrativo/avulso: cartão, contador, etc.), hoje
misturados na tabela `costs` sob categorias livres (`cost_categories`, ver item 3 da
exploração de custos).

**Abordagem proposta:**
1. Adicionar coluna `kind` (`operational` | `expense`) na tabela `costs` (migração nos
   moldes das existentes em `database.ts` ~linhas 188-234), com categorias existentes
   (`fuel`, `oil`, `maintenance`, `salary`, `toll`) mapeadas pra `operational` por
   default, e novas categorias podendo escolher o tipo na tela de configurações de
   categorias.
2. `costSchema` (`schemas.ts:217-229`) ganha `kind`.
3. `Costs.tsx` ganha um filtro/toggle Custo vs Despesa na aba de custos (reaproveitando o
   padrão de filtro por categoria já existente, linhas 446-473).
4. Dashboard (`dashboard.handlers.ts`) separa `operationalCost` (usado no CPK/rentabilidade
   por viagem) de `expenseCost` (não entra na rentabilidade operacional, mas pode aparecer
   num card financeiro à parte).

Esse é o item de maior superfície — toca schema, migração, 2+ telas e o dashboard. Como o
próprio Marcão sinalizou incerteza ("foge da proposta inicial"), recomendo tratar como
etapa isolada e validar o modelo de dados com ele antes de já criar categorias/telas
novas, mesmo estando no escopo.

---

## 5. Tela de lançamentos horizontal / expandir (evitar scroll, principalmente peso extra)

**Estado atual:** `Trips.tsx:894-902` usa `Modal` (`ui.tsx:607-639`, `max-w-lg
max-h-[90vh] overflow-y-auto`) com grid 2 colunas internamente — já não é single-column,
mas o modal é estreito (`max-w-lg` ≈ 512px) e cresce verticalmente até precisar rolar,
especialmente quando o toggle "Peso Excedente" (linhas 1226-1295) abre o painel extra.

**Proposta:** aumentar a largura do modal (`max-w-lg` → `max-w-3xl` ou similar) e
reorganizar pra 3 colunas em telas largas, ou usar um modal wide dedicado (`ui.tsx` já
tem o componente `Modal`, adicionar variante de tamanho via prop `size` se não existir).
Isso reduz a altura necessária e portanto o scroll. Overweight, por ser condicional,
pode virar uma coluna lateral fixa em vez de painel que empurra o resto pra baixo.

---

## 6. Auto-scroll no Select de produto (navegação por teclado) ✅ IMPLEMENTADO

**Causa raiz confirmada:** `ui.tsx`, componente `Select` (linhas 219-524). Navegação por
seta atualiza `highlightedIndex` (linhas 452-468) mas as opções (linhas 493-513) não têm
`ref` individual, e não há nenhum `scrollIntoView` no arquivo — a lista
(`max-h-52 overflow-y-auto`, linha 473) nunca rola pra acompanhar o item destacado.

**Proposta:** array de refs por opção (callback ref indexado) + `useEffect` reagindo a
`highlightedIndex` chamando `optionRef.current?.scrollIntoView({ block: 'nearest' })`.
Fix pequeno e localizado, corrige pra todos os Selects do sistema (produto, cliente,
caminhão, motorista etc.), não só o de produto.

**Status:** feito em `ui.tsx` (`optionRefs` + `useEffect` de scroll). Afeta todos os
Selects do sistema.

---

## 7. Fluxo sequencial de lançamento ("lançar de novo" sem clicar em Novo Lançamento)

**Estado atual:** `save()` em `Trips.tsx:290-319` sempre fecha o modal
(`setModal(false)`, linha 312) e reseta o form. Não existe "salvar e continuar".

**Proposta:** adicionar opção no modal (botão extra "Salvar e Novo" ao lado de "Salvar
Lançamento", ou um toggle "Continuar lançando" que persiste entre submits) que, em vez de
`setModal(false)`, chama `reset(EMPTY)` mantendo o modal aberto e focando o primeiro
campo. "Obrigar" (sem opção de desligar) tende a irritar quem só quer lançar um registro
e sair — recomendo botão dedicado em vez de comportamento forçado, mas a decisão final é
do Marcão/usuário.

---

## 8. Filtro por fornecedor nos custos ✅ IMPLEMENTADO

**Causa raiz:** `supplier_id` já existe em schema, tabela `costs`, formulário
(`Costs.tsx:916-943`) e até aparece na listagem (`row.supplier_name`, linha 511-513). O
backend `costs:list` (`costs.handlers.ts:26-59`) já aceita `filters.supplier_id`. Só
falta o frontend: não há estado de filtro nem UI pra fornecedor, e `loadCosts()`
(linhas 180-186) não envia esse parâmetro.

**Proposta:** adicionar `filterSupplierId` ao estado (ao lado de `filterCategory`,
linha 86), um `Select` de fornecedor na barra de filtros (mesmo padrão do filtro de
categoria/data), e passar `supplier_id` em `loadCosts()`. Fix pequeno, backend já pronto.

**Status:** feito em `Costs.tsx` — `filterSupplierId` + Select "Fornecedor" na barra de
filtros, `loadCosts()` já envia `supplier_id`.

---

## 9. Condensar Contas a Receber ✅ IMPLEMENTADO

**Causa raiz:** `Receivables.tsx:281-374`, tabela nativa com células `px-6 py-4` em
todas as linhas (header e body) — altura vem só do padding, não de gap entre "cards".

**Proposta:** reduzir `py-4` → `py-2` ou `py-2.5` nas células (linhas 285-370), e
opcionalmente `gap-4`/`mb-8`/`mb-6`/`p-6`/`p-4` nos blocos de KPI/filtro no topo da
página. Fix mecânico, mesmo padrão do item 2 mas em CSS de tela em vez de PDF.

**Status:** feito — células da tabela em `py-2.5`.

---

## 10. Módulo de custos a pagar parcelado (com prazo/status)

**Causa raiz:** já existe parcelamento (`installments`, `installment_group_id/number/total`
em `costSchema`/`costs`, `costs.handlers.ts:61-115`) — mas é "parcelamento contábil": insere
todas as parcelas já como lançadas, **sem status de pagamento** (sem `open`/`paid`,
sem `due_date` vs `paid_date`, sem tela de dar baixa). Diferente de `receivables`, que
já tem esse controle completo (`receivables.handlers.ts:43-51`, `Receivables.tsx`).

**Proposta:** estender a tabela `costs` (ou criar tabela irmã `cost_installments` ligada
por `installment_group_id`) com `status` (`open`/`paid`), `due_date`, `paid_date`,
espelhando o modelo de `receivables`. UI: reaproveitar o padrão de `Receivables.tsx`
(bulk-action bar de dar baixa, badge de status) adaptado pra Custos. Overlap direto com
item 4 (Custo vs Despesa) — parcelas de "custo a pagar" tendem a ser `despesa` na prática
(ex. compra de motor a prazo), então recomendo decidir o modelo de `kind` do item 4
antes de implementar este, pra não remodelar duas vezes.

---

## 11. Tirar combustível dos custos operacionais (duplicado com tela de Abastecimentos)

**Causa raiz confirmada — bug de double-counting real:**
`dashboard.handlers.ts:200` — `operationalCost = directCosts + fuelCosts + commissionCost + fuelRecordsCost`,
onde `directCosts` já soma qualquer linha de `costs` com `category = 'fuel'`, **e**
`fuelRecordsCost` soma a tabela separada `fuel_records` (aba Abastecimentos). Se o
usuário lança o mesmo abastecimento nos dois lugares, conta duas vezes na rentabilidade.

**Proposta:**
1. Parar de oferecer `fuel` como categoria selecionável em novos custos (categoria
   `is_deletable: 0` pode virar oculta/depreciada em vez de removida, pra não quebrar
   histórico já lançado).
2. `directCosts` no dashboard deve **excluir** `category = 'fuel'` do somatório
   (já que `fuelRecordsCost` cobre isso via a tela dedicada de Abastecimentos).
3. Dados históricos com `category = 'fuel'` em `costs`: decidir com o Marcão se migra
   pra `fuel_records` ou fica como está e só passa a ser ignorado no cálculo (mais
   simples, sem risco de migração malfeita).

Cuidado: `fuel_records` também alimenta o cálculo de km via odômetro (item 3) — não mexe
nisso, só no somatório de custo duplicado.

---

## 12. Editar custo já lançado ✅ IMPLEMENTADO

**Causa raiz confirmada:** backend já tem tudo — `costs:update` implementado
(`costs.handlers.ts:117-136`) e exposto no preload (`src/preload/index.ts:115`). O
frontend nunca chama. `Costs.tsx:500-546` só tem botão de excluir (linhas 533-543), sem
botão de editar nem modo edição no `costModal`.

**Proposta:** adicionar botão de editar ao lado do de excluir (mesmo padrão hover de
outras telas, ex. Trips), abrindo o mesmo modal de criação em modo edição (preenchendo
o form com os dados da linha e trocando `saveCost`/create por update). Fix mecânico,
backend 100% pronto — menor esforço de todos os itens de feature.

**Status:** feito em `Costs.tsx` — botão editar na tabela, `editingCost` state, modal
com título/label dinâmico, `saveCost` ramifica create/update.

(Mesma lacuna existe em Abastecimentos — `fuel.handlers.ts` só tem create/delete, sem
update nem no backend. Fora do pedido original do Marcão, mas mencionar como achado.)

---

## 13. Cabeçalho com dados do cliente no PDF (CNPJ, endereço, período) — opcional

**Causa raiz:** não existe "PDF de lançamento individual" — só o relatório em lote
(mesmo `Trips.tsx` + `pdfGenerator.ts` do item 1/2), filtrável por cliente. A query de
`trips:list` (`trips.handlers.ts:39,45`) só traz `customer_name`, não `cnpj`/`address`
(campos já existem em `Customer`, só não são selecionados nem tipados em `Trip`).
Período da amostra já é montado (`buildExportFileMeta`, `Trips.tsx:413-469`) e vira
subtítulo do PDF.

**Proposta:**
1. `trips.handlers.ts`: adicionar `c.cnpj as customer_cnpj, c.address as customer_address`
   no SELECT.
2. `types.ts` (Trip): adicionar os dois campos.
3. `pdfGenerator.ts`: novo parâmetro opcional (ex. `clientHeader: { name, cnpj, address }`)
   que desenha linhas extras acima da tabela quando o relatório está filtrado por um
   único cliente (checkbox "Incluir dados do cliente" no diálogo de exportação,
   conforme "(opcional)" pedido).

---

## 14. Viagem terceirizada não deveria contar como receita

**Causa raiz confirmada:** `is_outsourced` (caminhão/motorista via `contractors`) já é
excluído do custo operacional (`dashboard.handlers.ts:9-11`, `INTERNAL_TRUCK`/
`INTERNAL_DRIVER`), mas comentário explícito na linha 521 confirma que **ainda entra**
em "Revenue by Customer".

**Proposta:** no cálculo de receita do dashboard (em torno da linha 521), aplicar o
mesmo filtro de `INTERNAL_TRUCK`/`INTERNAL_DRIVER` já usado pro custo, excluindo viagens
outsourced da receita também. Verificar se "receita total" exibida em outros cards
(ex. KPI do topo) usa a mesma função ou uma query separada que precise do mesmo ajuste.

---

## Observações gerais

- Itens **6, 8, 9, 12** são os de menor risco/esforço (fixes localizados, sem mudança de
  schema).
- Itens **1, 2, 3, 13, 14** tocam cálculo/apresentação de dados existentes, risco médio
  (testar com dados reais antes de considerar pronto, principalmente CPK e receita).
  cálculo, testar contra números que o Marcão já conhece).
- Itens **4, 10, 11** tocam schema/migração e têm dependência entre si (10 depende do
  modelo definido em 4; 11 tem decisão de dado histórico em aberto) — tratar em conjunto
  quando chegar a vez deles.
- Item **5, 7** são UX puro, sem risco de dado, podem ser feitos a qualquer momento.

## Verificação

Sem suíte de testes automatizados cobrindo esses fluxos (confirmar rodando
`npm run type-check` após cada mudança de schema/tipo). Verificação principal é manual:
`npm run dev`, testar cada tela afetada (Trips, Costs, Receivables, Dashboard, export
PDF) com dados reais antes de dar como concluído, comparando números de CPK/receita
antes e depois da mudança com o que o Marcão já sabe ser correto.
