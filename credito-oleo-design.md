# Crédito de Óleo — Solução Implementada

## Objetivo

Controlar créditos de óleo diesel entre um cliente e seu fornecedor vinculado,
registrar abastecimentos como consumo de crédito ou compra normal e gerar
fechamentos de cobrança com o valor líquido a receber.

## Arquitetura

Foi criado um módulo financeiro próprio. Os abastecimentos continuam em
`fuel_records`, enquanto `oil_credit_movements` é o ledger e a fonte de verdade
do saldo. A separação preserva histórico e permite auditar créditos, consumos e
ajustes sem misturar compras normais com crédito.

## Regras de negócio

### Cliente e fornecedor

- Clientes e fornecedores continuam sendo cadastros independentes.
- Um fornecedor pode ser vinculado a um cliente.
- O vínculo é obrigatório para lançar ou consumir crédito.
- O fornecedor só pode ser usado com o cliente ao qual está vinculado.

### Saldo

Existe uma conta única por combinação cliente/fornecedor. O saldo é calculado
pelos movimentos:

`saldo = créditos + ajustes - consumos`

O saldo é mantido em reais e litros. O vencimento é atualizado pelo crédito ou
ajuste mais recente. Crédito vencido pode ser consumido, mas retorna alerta.

### Medidas

Para créditos, ajustes e abastecimentos, duas entre valor total, litros e preço
por litro devem ser informadas. O sistema calcula a terceira. Valor ou litragem
consumidos acima do saldo disponível são rejeitados.

### Abastecimentos

Novos abastecimentos exigem vale único globalmente, caminhão, data, fornecedor,
medidas e classificação:

- **Crédito:** reduz o saldo em reais e litros e fica disponível para fechamento;
- **Normal:** não altera o crédito e aparece no Contas a Pagar;
- **Histórico sem classificação:** registros anteriores à funcionalidade.

Abastecimentos normais usam o próprio `fuel_record` como conta a pagar. A baixa
registra a data de pagamento e não cria uma linha duplicada em `costs`.

### Fechamento

O fechamento seleciona cliente, fornecedor, período dos fretes, vencimento e
abastecimentos de crédito ainda não usados em outro fechamento.

`frete bruto = soma das viagens do cliente no período`

`débito de óleo = soma dos abastecimentos de crédito selecionados`

`valor líquido = frete bruto - débito de óleo`

O valor líquido não pode ser negativo. O fechamento cria uma conta consolidada
em Contas a Receber e marca os recebíveis individuais das viagens como
consolidados, evitando duplicidade. Fechamentos abertos podem ser editados; a
edição recalcula valores, vencimento, itens e cobrança vinculada.

## Banco de dados

As migrações são idempotentes e preservam bancos existentes.

### Alterações

- `suppliers.customer_id`;
- `fuel_records.voucher_number`;
- `fuel_records.price_per_liter`;
- `fuel_records.fuel_mode`;
- `fuel_records.status`;
- `fuel_records.paid_date`;
- `receivables.settlement_id`;
- `receivables.consolidated_into_id`.

Registros antigos permanecem com os novos campos nulos: não recebem
classificação automática, não alteram saldo e não entram automaticamente em
fechamentos.

### Novas tabelas

- `oil_credit_accounts`: conta única por cliente/fornecedor e vencimento atual;
- `oil_credit_movements`: movimentos `credit`, `consumption` e `adjustment`,
  com valor, litros, preço, data e origem;
- `oil_settlements`: fechamento, período, fretes, óleo, líquido, status e
  recebível consolidado;
- `oil_settlement_items`: vales, litros, preço e valor de cada abastecimento.

## IPC e APIs

O preload expõe:

```ts
oilCredits.listAccounts()
oilCredits.getAccount(customerId, supplierId?)
oilCredits.addCredit(data)
oilCredits.adjust(data)
oilCredits.createSettlement(data)
oilCredits.updateSettlement(id, data)
oilCredits.listSettlements(filters?)
oilCredits.getSettlement(id)
oilCredits.exportData(id)
```

Também foi adicionada a baixa de abastecimento normal:

```ts
fuel.markPaid({ id, paid_date })
```

## Interface

Dentro da página `Custos`, a aba `Crédito de Óleo` oferece lista de contas, saldos em reais/litros,
vencimento e alerta, seleção de cliente/fornecedor, crédito, ajuste, criação e
edição de fechamento, resumo de fretes/óleo/líquido e exportação PDF com vales,
litros, preço por litro e valores.

O item independente da barra lateral foi removido. A rota antiga `/oil-credits`
redireciona para `/costs`, mantendo compatibilidade com acessos salvos.

O cadastro de fornecedores permite o vínculo com cliente. O formulário de
abastecimento inclui vale, preço por litro e classificação normal/crédito.
Abastecimentos normais aparecem no Contas a Pagar e podem ser baixados.
Contas a Receber identifica a cobrança consolidada e oculta seus recebíveis
individuais consolidados para evitar duplicidade.

## Fluxo operacional

1. Cadastre a empresa em Clientes.
2. Cadastre o fornecedor e vincule-o ao cliente.
3. Lance o crédito com duas medidas e vencimento.
4. Registre abastecimentos com vale, medidas e classificação.
5. Use a tela Crédito de Óleo para conferir saldo e fechar o período.
6. Salve ou edite o fechamento e exporte o PDF da cobrança.

## Compatibilidade e segurança

- Migrações verificam colunas antes de executar `ALTER TABLE`.
- O vale possui unicidade global para novos lançamentos.
- Crédito vencido alerta, mas não bloqueia o consumo.
- Saldo insuficiente, fornecedor sem vínculo e óleo acima dos fretes são
  rejeitados.
- Abastecimento já usado em fechamento não pode ser reutilizado ou excluído.

## Verificação

Executados com sucesso:

```text
npm run type-check
npm run build
npm run lint
```

O projeto não possui uma suíte automatizada de testes configurada no
`package.json`.
