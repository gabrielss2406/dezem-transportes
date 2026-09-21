# Relatório de modificações solicitadas pelo cliente

## Contexto

Este documento registra como as mensagens recebidas foram interpretadas e quais soluções foram aplicadas no sistema Dezem Gestão de Frota.

O objetivo principal foi separar corretamente o **DRE**, que representa o resultado operacional, do **saldo bancário**, que representa a posição de dinheiro informada pelo usuário.

## 1. Saldo bancário independente do DRE

### Como foi entendido

O cliente não quer que o saldo bancário seja tratado como receita ou que seja recalculado automaticamente com base em contas a receber, custos e baixas.

O usuário deve poder informar diretamente quanto existe no banco naquele momento.

### Problema anterior

O saldo era calculado a partir das movimentações financeiras:

- recebimentos pagos;
- custos pagos;
- ajustes lançados em Contas a Receber.

Essa abordagem fazia com que um saldo já existente pudesse ser confundido com receita do período.

### Solução aplicada

- O saldo bancário passou a ser armazenado como uma configuração manual.
- O Dashboard consulta esse valor diretamente.
- Receitas, custos, salários e baixas não alteram o saldo automaticamente.
- O valor não entra em receita, lucro, CPK ou qualquer cálculo do DRE.
- Foi criada uma edição pelo próprio Dashboard.
- Foi adicionado um botão **Saldo Bancário** no menu lateral.
- O botão do menu abre o Dashboard já com o modal de edição aberto.
- O campo foi removido da tela de Configurações.

## 2. Lançamento parcial de salários

### Como foi entendido

O cliente não paga necessariamente o salário inteiro de uma vez. Pode lançar, por exemplo:

- um adiantamento no dia 10;
- o complemento no dia 20;
- uma comissão em outro momento.

Por isso, o lançamento não deve ser limitado a um único salário mensal por motorista.

### Problema anterior

O botão **Lançar Salários** lançava automaticamente o salário mensal completo de todos os motoristas elegíveis e impedia novos lançamentos no mesmo mês.

### Solução aplicada

- O botão agora abre uma tela de seleção de motoristas.
- Apenas motoristas internos ativos são exibidos.
- Cada motorista pode ser selecionado individualmente.
- O valor mensal cadastrado aparece como sugestão.
- O usuário pode alterar o valor de cada motorista.
- A data do lançamento é informada pelo usuário.
- Vários lançamentos podem ser feitos para o mesmo motorista no mesmo mês.
- Cada operação gera um custo separado de categoria **Salário**.
- Valores iguais a zero não geram lançamentos.

## 3. Litros e consumo no CPK

### Como foi entendido

O sistema já possuía os dados de litros abastecidos e quilometragem usados no cálculo do CPK. O pedido foi tornar esses dados visíveis para facilitar a análise.

Foi adotado o indicador:

- litros totais abastecidos;
- média de consumo em litros por quilômetro, ou **L/km**.

### Solução aplicada

No card geral do Dashboard, junto ao CPK, passaram a aparecer:

- quilômetros da frota;
- litros abastecidos;
- média L/km.

Na tabela de rentabilidade por caminhão, foram adicionadas as colunas:

- Litros;
- L/km.

O cálculo considera abastecimentos registrados diretamente e abastecimentos vinculados às viagens.

Quando não existem leituras suficientes para calcular o consumo, o sistema exibe **N/D**, evitando apresentar um valor incorreto.

## 4. Descrição destacada nos relatórios

### Como foi entendido

As descrições dos lançamentos precisam ser fáceis de localizar durante a conferência dos relatórios.

### Solução aplicada

- As descrições passaram a ser exibidas em negrito nas tabelas da aplicação.
- A geração de PDF foi ajustada para aplicar negrito automaticamente à coluna cuja descrição esteja identificada no relatório.
- A regra vale para relatórios de Contas a Receber, Custos, Credores e demais relatórios que possuam coluna de descrição.

## 5. Atalhos de filtro por quinzena

### Como foi entendido

O cliente costuma analisar os relatórios em períodos de quinze dias. Para reduzir o trabalho manual, foram criados atalhos para:

- primeira quinzena: dia 1 até dia 15;
- segunda quinzena: dia 16 até o último dia do mês.

### Solução aplicada

Foi criada uma função reutilizável para calcular o intervalo correto considerando a quantidade real de dias do mês.

Os atalhos foram disponibilizados em:

- Contas a Receber;
- Custos;
- Relatório por Credor;
- Lançamentos/Viagens.

Os filtros de mês completo e período personalizado continuam disponíveis.

## 6. Fluxo de caixa mensal

### Como foi entendido

A criação de um card específico para fluxo de caixa mensal foi identificada como uma sugestão de usabilidade, não como uma definição fechada do cliente.

### Situação atual

Esse card ainda não foi implementado porque é necessário validar com o cliente quais informações devem aparecer, por exemplo:

- saldo inicial;
- entradas;
- saídas;
- saldo final;
- período considerado.

O saldo bancário manual já foi implementado de forma independente. O card detalhado de fluxo mensal pode ser criado depois que o formato for confirmado.

## Arquivos principais alterados

- `src/main/modules/dashboard/dashboard.handlers.ts`
- `src/main/modules/costs/costs.handlers.ts`
- `src/main/modules/settings/app-settings.ts`
- `src/main/modules/settings/settings.handlers.ts`
- `src/preload/index.ts`
- `src/shared/schemas.ts`
- `src/shared/types.ts`
- `src/renderer/src/pages/Dashboard.tsx`
- `src/renderer/src/pages/Costs.tsx`
- `src/renderer/src/pages/Receivables.tsx`
- `src/renderer/src/pages/Trips.tsx`
- `src/renderer/src/pages/Settings.tsx`
- `src/renderer/src/components/Sidebar.tsx`
- `src/renderer/src/lib/pdfGenerator.ts`
- `src/renderer/src/lib/utils.ts`

## Validações realizadas

Foram executados com sucesso:

- `npm run type-check`;
- `npm run build`;
- verificação do Biome;
- `git diff --check`.

O projeto não possui uma suíte automatizada configurada no script `npm test`. Por isso, os fluxos principais ainda precisam ser conferidos manualmente no aplicativo.

## Testes manuais recomendados

1. Alterar o saldo pelo botão do menu e confirmar que o card do Dashboard foi atualizado.
2. Criar ou baixar receitas e custos e confirmar que o saldo manual não mudou.
3. Reiniciar o aplicativo e confirmar que o saldo foi preservado.
4. Lançar valores diferentes para motoristas diferentes.
5. Lançar duas parcelas para o mesmo motorista no mesmo mês.
6. Conferir litros e L/km no card geral e por caminhão.
7. Testar caminhão sem quilometragem suficiente e conferir o indicador N/D.
8. Testar as duas quinzenas em meses de 28, 29, 30 e 31 dias.
9. Exportar PDFs e conferir se as descrições aparecem em negrito.
