# Ajustes financeiros — Contas a Receber, Custos, Trips e Dashboard

## Context

Cliente (Ewel) mandou uma lista de pedidos soltos via WhatsApp sobre o módulo financeiro. Conversamos item a item pra transformar em requisitos técnicos concretos. Resultado: 6 mudanças independentes, cada uma tocando um canto diferente do app (nenhum "Contas a Pagar" existe como página própria — o equivalente real é a página **Custos**).

## 1. Ordenação do relatório de Contas a Receber

Hoje a lista/PDF de Contas a Receber vem com o registro mais recente primeiro (`DESC`). Cliente quer invertido: mais antigo primeiro, mais recente por último.

**Arquivo:** `src/main/modules/receivables/receivables.handlers.ts:37`
- Trocar `ORDER BY COALESCE(t.date, r.due_date) DESC` → `ASC`
- Tabela na tela e o PDF export (`Receivables.tsx`) usam a mesma lista retornada por esse handler, então os dois mudam juntos automaticamente.

## 2. Filtro por período customizado — Contas a Receber e Custos

Hoje ambas as páginas só filtram por mês inteiro (`MonthNavigator`). Cliente quer poder escolher um range livre (ex: 01 a 15) mantendo a opção de mês inteiro.

**Padrão a reaproveitar:** a aba Comissões em `Costs.tsx` (~linha 780-793) já usa dois `DatePicker` (Data Inicial/Final) — mesmo componente de `components/ui.tsx`.

**Receivables.tsx:**
- Adicionar toggle "Mês" / "Período" perto do `MonthNavigator` (linha ~291).
- Modo "Mês": comportamento atual (`monthRangeFromKey`).
- Modo "Período": dois `DatePicker`, estado `receivablesRangeStart`/`receivablesRangeEnd`, passados direto como `startDate`/`endDate` pro `loadReceivables` (linha ~77-87) no lugar do range calculado.

**Costs.tsx (aba Custos Operacionais):**
- Mesmo toggle, ao lado do `MonthNavigator` (linha ~468).
- Mesma lógica: modo período substitui `monthRangeFromKey(costMonth)` em `loadCosts` (linha ~196-205) por range livre.
- Filtro de fornecedor já existe (`filterSupplierId`, linha 97) e já cobre "um único" (selecionado) e "todos" (vazio) — nenhuma mudança necessária aí.

Backend de ambos (`receivables.handlers.ts`, `costs.handlers.ts`) já aceita `startDate`/`endDate` livres — não precisa mudar nada no main process pra esse item.

## 3. Relatório PDF de Custos por fornecedor

Custos.tsx não tem exportação nenhuma hoje (Receivables.tsx tem). Adicionar seguindo o mesmo padrão:

**Arquivo:** `src/renderer/src/pages/Costs.tsx`
- Importar `generatePdf` de `lib/pdfGenerator.ts` (mesmo import de `Receivables.tsx:18`).
- Novo botão no `PageHeader` (`secondaryActionLabel="Exportar PDF"` + `onSecondaryAction`), espelhando `Receivables.tsx:261-262`.
- Handler `handleExportPdf`: título "Custos" / "Contas a Pagar", subtítulo com fornecedor + período filtrados, headers `Data, Descrição, Categoria, Fornecedor, Valor, Status`, rodapé com total — mesma estrutura de `Receivables.tsx:153-210`.
- Usa a lista já filtrada (`filteredCosts` / resultado de `loadCosts`), respeitando fornecedor único ou todos e o período (mês ou range, do item 2).

## 4. Diferenciação visual de viagens com motorista terceirizado — Trips.tsx

Motoristas já têm `is_outsourced` (`drivers.is_outsourced`, ver `database.ts:432-435`, tipo em `lib/types.ts:49`). Hoje `Trips.tsx` não usa esse campo em nenhum lugar — motoristas terceirizados aparecem misturados sem diferença visual.

**Arquivo:** `src/renderer/src/pages/Trips.tsx`

1. **Badge na linha:** ao lado do nome do motorista na tabela, `<Badge label="TERCEIRO" color="blue" />` quando `row.driver_is_outsourced` (precisa expor esse campo no join do backend de trips, se ainda não vier — checar `trips.handlers.ts` list query e incluir `d.is_outsourced as driver_is_outsourced`). Reaproveita `Badge` de `components/ui.tsx:543-558` (já importado em Trips.tsx:9, já usado em linhas 871/1283).
2. **Tint na linha:** quando terceirizado, aplicar `border-l-4 border-tertiary` (ou classe similar) na `<tr>`/linha da tabela pra bater o olho na lista toda.
3. **Toggle + contagem separada:** filtro "Próprios / Terceirizados" no topo da página, mesmo padrão de `Drivers.tsx:368-376` (`view === 'internal' | 'outsourced'`), com card de total de viagens de terceiro separado.

## 5. Gráfico "Evolução do Faturamento" — 4 categorias coloridas, toggle de série, export de imagem

**Backend — `src/main/modules/dashboard/dashboard.handlers.ts`:**
- A query de 6 meses (linha ~308-322) hoje só agrupa `revenue`. Estender com queries agrupadas por mês (`strftime('%Y-%m', date)`) equivalentes às já existentes para o período total (linhas 64-159: `directCosts`, `fuelCosts`, `commissionCost`, `fuelRecordsCost`, `totalTax`, `expenseCost`), mantendo os mesmos filtros de `INTERNAL_TRUCK`/`INTERNAL_DRIVER`.
- Combinar no loop de 6 meses (linha ~337-349) pra montar `monthlyBreakdown: Array<{ month, revenue, cost, expense, net }>` (renomeando/estendendo o atual `monthlyRevenue`, ajustar `DashboardSummary` em `lib/types.ts:190-246` e o consumo em `Dashboard.tsx`).

**Frontend — `src/renderer/src/pages/Dashboard.tsx` (~linha 287-337):**
- Trocar o bloco de barra única por 4 barras agrupadas por mês (Bruto/Custo/Despesa/Líquido), cores conforme item de design abaixo.
- Checkboxes/chips de legenda acima do gráfico pra ligar/desligar cada categoria (estado local, filtra o que renderiza).
- Botão "Exportar imagem" que captura o container do gráfico.

**Cores — novos tokens MD3 (não existem hoje: só primary/secondary/tertiary/error):**
- `tailwind.config.js`: adicionar `chart-blue`, `chart-yellow`, `chart-green` (padrão `rgb(var(--chart-x))`, igual aos demais).
- `src/renderer/src/index.css`: adicionar `--chart-blue`, `--chart-yellow`, `--chart-green` no bloco `:root` (light, ~linha 7-19) e no bloco `.dark` (~linha 42-54), com triplets RGB no mesmo estilo dos existentes.
- Custo (vermelho) reaproveita o token `error` já existente — não precisa criar novo.

**Export de imagem — nova dependência:**
- Adicionar `html-to-image` (`npm install html-to-image`) — sem binário nativo, seguro pro build Electron.
- Renderer: captura o `ref` do container do gráfico via `toPng()`, gera blob/dataURL.
- Novo canal IPC `export-image` no `src/main/index.ts`, espelhando o handler `export-pdf` (linhas 69-84): recebe buffer, salva em `app.getPath('documents')`, abre com `shell.openPath`.
- Expor no preload (`src/preload/index.ts`) e em `window.api` types (`lib/types.ts`), mesmo padrão de `exportPdf`.

## 6. Novos cards no Dashboard — Saldo Bancário, Contas a Receber, Contas a Pagar, Receita detalhada

Ewel mandou um rascunho manuscrito (foto) com um wireframe: coluna de cards Receita (Bruta/Impostos/Líquida) → Custo → Despesa → Lucro → CPK, e ao lado 3 cards menores intercalados: **Saldo Bancário**, **Contas a Receber**, **Conta a Pagar**. A maioria desses dados já existe no backend do Dashboard, só falta expor.

**Backend — `src/main/modules/dashboard/dashboard.handlers.ts`:**
- `revenue`, `tax`, `netRevenue` já são calculados (linhas 43, 125-137, 575-576) — só precisa garantir que os 3 (Bruta/Impostos/Líquida) estão expostos juntos no retorno pra virar um card único com 3 linhas.
- **Contas a Receber (em aberto):** nova query `SELECT COALESCE(SUM(amount),0) FROM receivables WHERE status = 'open'` — total em aberto, sem filtro de período (é "quanto falta receber" no momento, não do range selecionado).
- **Contas a Pagar (em aberto):** nova query equivalente em `costs WHERE status = 'open'`.
- **Saldo Bancário (calculado):** `SUM(receivables WHERE status='paid') - SUM(costs WHERE status='paid')`, histórico completo (sem filtro de período — é saldo acumulado, não do range do dashboard).
- Adicionar os 3 novos campos ao objeto retornado (perto de linha 573-592) e ao tipo `DashboardSummary` em `lib/types.ts:190-246`.

**Frontend — `src/renderer/src/pages/Dashboard.tsx`:**
- Estender a seção de KPI cards (linhas ~225-285) com os 3 novos cards (Saldo Bancário, Contas a Receber, Contas a Pagar), mesmo componente de card já usado ali.
- Card de Receita ganha as 3 linhas (Bruta/Impostos/Líquida) explícitas, se ainda não estiver assim.

## Verification

- `npm run type-check` após mudanças de tipos (`DashboardSummary`, novo `driver_is_outsourced` em trips, novo `exportImage` na window API).
- `npm run dev`, testar manualmente cada item:
  - Contas a Receber: conferir ordem ASC na tabela e no PDF exportado; alternar Mês/Período e conferir range 01-15 funcionando.
  - Custos: alternar Mês/Período, filtrar por 1 fornecedor e por "todos", exportar PDF e conferir conteúdo/total.
  - Trips: cadastrar/ver viagem com motorista terceirizado — badge, tint de linha e toggle com contagem aparecendo corretamente; viagem com motorista próprio sem badge.
  - Dashboard: gráfico de 6 meses com 4 cores, ligar/desligar categorias via legenda, exportar imagem e abrir o arquivo gerado, testar em dark e light mode (tokens novos).
  - Dashboard: conferir Saldo Bancário / Contas a Receber / Contas a Pagar batendo com soma manual das tabelas (status open/paid), card de Receita com Bruta/Impostos/Líquida.
