# Histórico de Saldo Bancário — snapshot mensal manual

## Pedido

O sistema precisa mostrar a evolução do saldo bancário ao longo dos meses, com gráfico e
histórico, mantendo o saldo como **valor informado manualmente** — não calculado a partir do
fluxo de caixa. Alterar o saldo de um mês não pode recalcular os outros.

## Situação anterior

O saldo bancário era **um único valor global**, guardado em `settings.app_settings.bankBalance`
(ver `RELATORIO-MODIFICACOES-CLIENTE.md`, seção 1). Consequências:

- Não havia histórico: ao informar o saldo de outubro, o de setembro era sobrescrito e perdido.
- O card "Saldo Bancário" do Dashboard mostrava sempre o último valor digitado, independente do
  período filtrado — o comentário no código já dizia que deveria ser recortado pelo período, mas
  não havia como, porque o valor não tinha mês.
- Não havia como montar gráfico nem série temporal.

## Decisão

Tabela nova `bank_balances`, uma linha por mês:

| coluna | conteúdo |
|---|---|
| `month` | `'YYYY-MM'` — **chave primária**: no máximo um registro por mês |
| `balance` | saldo informado para aquele mês |
| `created_at` | quando o saldo daquele mês foi registrado pela primeira vez |
| `updated_at` | última alteração (mantém o `created_at` original ao editar) |

Regras que a estrutura garante por construção:

- **Mês é identidade, não filtro.** Gravar um mês é um `INSERT ... ON CONFLICT(month) DO UPDATE`
  que toca exatamente uma linha. Nenhum outro mês é lido, recalculado ou reescrito.
- **Mês sem registro não existe na tabela.** Não é zero e não herda o valor do mês anterior. Onde
  o usuário nunca informou, a interface mostra "Não informado" e o gráfico deixa um vão na linha.
- **Nunca derivado.** Nada em viagens, recebíveis ou custos escreve nessa tabela. É a única fonte
  do card "Saldo Bancário" e do gráfico de histórico.

`created_at`/`updated_at` usam `datetime('now', 'localtime')` — diferente das outras tabelas, que
usam UTC — porque aqui a data é exibida ao usuário como "registrado em / atualizado em".

### Migração do valor antigo

Na primeira execução após a atualização, se `bank_balances` está vazia e existe um
`settings.app_settings.bankBalance` maior que zero, esse valor entra como o saldo do **mês
corrente**. Ninguém perde o número que já tinha digitado. Depois disso o campo antigo deixa de ser
lido e de ser gravado, e foi removido de `AppSettings` — a tabela passa a ser a única fonte.

### Alternativas descartadas

- **Calcular o saldo a partir de recebíveis pagos menos custos pagos:** é justamente o que o
  cliente rejeitou (ver `DECISOES-AJUSTE-SALDO-DRE.md`). O saldo é a posição real do banco,
  conferida por ele; o sistema não tem todas as movimentações.
- **Guardar um histórico em JSON dentro de `settings`:** sem chave primária por mês, sem
  consulta por mês e sem `updated_at` — a garantia de "um registro por mês" ficaria no código em
  vez de no banco.
- **Preencher meses faltantes com o valor do mês anterior:** mostraria um saldo que o usuário
  nunca informou como se fosse informação real.

## Onde foi implementado

- `src/main/database.ts` — tabela `bank_balances` e migração do valor antigo.
- `src/main/modules/bank-balances/bank-balances.handlers.ts` — `list`, `get`, `set` (upsert).
- `src/shared/schemas.ts` — `bankBalanceSchema` (mês + valor); `bankBalance` saiu de
  `appSettingsSchema`.
- `src/shared/types.ts` — `BankBalanceRecord`; `bankBalance` saiu de `AppSettings`.
- `src/preload/index.ts` — `window.api.bankBalances`.
- `src/main/modules/dashboard/dashboard.handlers.ts` — `bankBalance` passa a ser o snapshot do mês
  em que o período começa (`null` quando não informado) e o resumo devolve também
  `bankBalanceMonth`.
- `src/renderer/src/components/BankBalanceHistory.tsx` — seção completa: navegação por mês,
  gráfico de linha, tabela de histórico e modal de registro/edição.
- `src/renderer/src/pages/Dashboard.tsx` — seção incluída; card "Saldo Bancário" mostra o mês a
  que se refere e "—" quando não há registro; o botão do topo rola até a seção.
- `src/renderer/src/pages/Overview.tsx` — a ação rápida do Menu grava o saldo do mês corrente.
- `src/renderer/src/lib/utils.ts` — `formatDateTime` para exibir os carimbos de data/hora.

## Como usar

Dashboard → seção **Histórico de Saldo Bancário**:

1. A seção abre no mês corrente; as setas navegam para meses anteriores e futuros.
2. **Registrar saldo** (ou **Editar saldo**, se o mês já tem valor) abre o modal com o valor do mês.
3. A tabela lista todos os meses registrados, com saldo, data de registro e última atualização;
   **Editar** em qualquer linha corrige aquele mês.
4. O gráfico mostra os últimos 12 meses do histórico. Clicar em um mês do gráfico o seleciona.

A ação rápida **Saldo Bancário** do Menu continua existindo e grava sempre o mês corrente.

## O que não muda

Receita, custos, despesas, lucro e DRE continuam sem qualquer relação com o saldo bancário. Lançar
ou dar baixa em recebíveis e custos não altera nenhum saldo mensal, e editar um saldo mensal não
altera nenhum número do DRE.

## Atualização — saldo calculado a partir do saldo inicial (Out/2026)

Pedido do cliente: baixa de conta a receber soma no saldo, baixa de conta a pagar desconta, e
abastecimento desconta automaticamente no vencimento, sem mudar o DRE.

O valor digitado em `bank_balances` passa a ser o **saldo inicial do mês**. O card "Saldo
Bancário" do Dashboard (`dashboard:summary`, `bankBalance`) agora é calculado em tempo de
consulta, sem gravar nada:

```
saldo = saldo inicial do mês de startDate
      + recebíveis baixados (kind='revenue', paid_date)
      - custos baixados (status='paid', paid_date, exceto category 'fuel')
      - abastecimentos com due_date <= hoje (fuel_records e trip_fuel_stops, caminhão interno)
      - repasses a terceiros quitados (settled_date)
```

Janela: do dia 1 do mês de `startDate` até `min(endDate, hoje)`. Detalhe em
`bankBalanceBreakdown`.

- Abastecimento não tem baixa manual: `due_date` (novo campo em `fuel_records` e
  `trip_fuel_stops`) define quando sai do saldo. Vazio = data do abastecimento. Registros
  antigos foram migrados com `due_date` = data do abastecimento.
- O DRE segue contando abastecimento na data do abastecimento (queries inalteradas).
- Recebível `kind='adjustment'` (atalho antigo de saldo inicial) **não** entra no saldo calculado,
  para não duplicar o saldo inicial digitado.
- Viagem de terceiro: a baixa do recebível entra e o repasse quitado sai.
- Mês sem saldo inicial continua "Não informado".
