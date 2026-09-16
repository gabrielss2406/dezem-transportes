# Ajuste de Saldo em Contas a Receber — não distorcer DRE

## Problema reportado

Ewel repassou reclamação de cliente (WhatsApp, 15/09/2026), resumida assim:

> Ao início do mês pego o saldo bancário para fazer o primeiro lançamento no fluxo de caixa. Porém o mesmo segue para o DRE. Seria correto? Acho que altera as informações. Não sei se é possível criar um módulo para este tipo de lançamento, para que permaneça no fluxo sem seguir para DRE. DRE mostra o que aconteceu no mês independente do fluxo.

## Minha interpretação

O usuário lança, todo início de mês, o saldo bancário já existente (posição de caixa herdada do mês anterior) como um recebível avulso, só pra o "Saldo Bancário" do dashboard começar o mês com o valor certo. O problema: esse valor também está sendo somado em `revenue` (receita) e, por consequência, em `Lucro`/`Lucro Líquido` — ou seja, dinheiro que já existia antes do mês começar está sendo contado como se fosse receita gerada no mês. Isso infla o DRE (Demonstrativo de Resultado), que deve refletir só o que aconteceu operacionalmente no período, independente da posição de caixa.

Não é um bug de cálculo — é ausência de um jeito de classificar um lançamento como "só afeta caixa, não é resultado operacional".

## Investigação no código

Não existe módulo de DRE nem de fluxo de caixa separados. Ambos são calculados juntos no handler `dashboard:summary` (`src/main/modules/dashboard/dashboard.handlers.ts`). As únicas formas manuais de lançamento sem vínculo a viagem, antes desta mudança:

- **Custo avulso** (`costs.kind`: `operational` | `expense`) — sempre subtrai do saldo bancário. Sinal errado pra representar saldo inicial (que é positivo).
- **Recebível avulso** (`receivables`, sem campo de classificação) — soma no `bankBalance` **e** em `revenue`/gráfico de receita mensal/ranking de clientes. Era a única opção disponível, mas por isso distorcia o DRE.

## Decisão

Adicionar `kind` em `receivables`, com valores `'revenue'` (default, comportamento atual) e `'adjustment'`. Só relevante pra recebíveis avulsos (`trip_id IS NULL`) — recebíveis de viagem continuam sempre `'revenue'`.

Regra de inclusão nas métricas do dashboard:

| Métrica | `adjustment` entra? |
|---|---|
| Saldo Bancário do período (`bankBalance`) | **Sim** — é caixa real, precisa refletir a posição verdadeira |
| Receita (`revenue`) / Lucro / Lucro Líquido | Não |
| Gráfico de receita mensal | Não |
| Ranking de clientes (Top 5) | Não |
| Card "Contas a Receber em Aberto" | Não |

Rótulo na interface: **"Ajuste de Saldo (não entra no DRE)"** — nome genérico de propósito, cobre não só o saldo bancário inicial do mês como qualquer outro ajuste de caixa não-operacional que apareça no futuro (aporte de sócio, correção manual, etc), sem precisar de um novo tipo a cada caso.

### Perguntas feitas ao usuário e respostas

1. **Rótulo do campo na UI** → escolhido "Ajuste de Saldo" (em vez de nome específico "Saldo Bancário Inicial" ou "Aporte/Ajuste de Caixa").
2. **Deve aparecer no card "Contas a Receber em Aberto" enquanto não baixado?** → Não. Um ajuste de saldo não é uma dívida de cliente, então não faz sentido listá-lo como "a receber em aberto" — consistente com a exclusão do DRE.

### Alternativas descartadas

- **Usar `costs.kind`**: sinal invertido (custo sempre subtrai do saldo), não serve pra representar um valor positivo como saldo inicial.
- **Criar tabela nova (`balance_adjustments`)**: over-engineering — `receivables` avulso já cobre criar/listar/dar baixa; faltava só o filtro de classificação pro DRE.

## Onde foi implementado

- `src/main/database.ts` — migration adiciona coluna `kind` em `receivables` (default `'revenue'`).
- `src/shared/schemas.ts` — `receivableSchema.kind`.
- `src/renderer/src/lib/types.ts` — `Receivable.kind`.
- `src/main/modules/receivables/receivables.handlers.ts` — `receivables:create` grava `kind`.
- `src/main/modules/dashboard/dashboard.handlers.ts` — filtro `kind = 'revenue'` em: receita avulsa, receita mensal avulsa, contas a receber em aberto. Sem filtro em: saldo bancário pago (intencional).
- `src/renderer/src/pages/Receivables.tsx` — campo "Tipo" no formulário de novo recebível avulso, badge "AJUSTE DE SALDO" na tabela.

## Como usar

Ao lançar o saldo bancário do início do mês: Contas a Receber → Novo → Tipo = "Ajuste de Saldo" → valor = saldo do banco no dia 1 → dar baixa na mesma data. Ele entra no Saldo Bancário do dashboard sem afetar Receita/Lucro/DRE.
