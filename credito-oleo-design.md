# Crédito de Óleo — Análise e Proposta

## Objetivo

Permitir que uma empresa atendida como cliente também seja cadastrada como fornecedora de óleo diesel, mantendo um crédito de óleo para abatimento nos fechamentos de cobrança.

O fechamento deve mostrar o valor dos fretes do período, o óleo abastecido usando crédito, o saldo de crédito e o valor líquido a receber, com uma data de vencimento definida.

## Contexto atual

O sistema já possui:

- cadastro separado de clientes e fornecedores;
- abastecimentos avulsos com fornecedor, valor, litros e data;
- abastecimentos vinculados a viagens;
- contas a pagar e contas a receber;
- relatório de contas a pagar por credor;
- vencimento em contas a receber;
- exportação de relatórios em PDF.

O que falta é relacionar cliente e fornecedor, controlar o crédito de óleo e classificar cada abastecimento quanto ao uso desse crédito.

## Alternativas analisadas

### 1. Ajustar diretamente os abastecimentos existentes

Adicionar campos de crédito aos registros atuais de abastecimento.

**Vantagens:** implementação inicial mais rápida.

**Riscos:** mistura abastecimento, crédito e contas a pagar na mesma estrutura; dificulta auditoria, histórico e cálculo de saldo.

### 2. Manter apenas um saldo simples no cadastro

Adicionar um saldo de crédito diretamente ao cliente ou fornecedor.

**Vantagens:** operação simples.

**Riscos:** não preserva adequadamente histórico de lançamentos, ajustes e fechamentos; dificulta explicar como o saldo foi formado.

### 3. Criar um módulo próprio de crédito e fechamento — recomendada

Criar uma camada financeira específica para créditos de óleo, usos de crédito e fechamentos, mantendo os abastecimentos atuais como origem operacional.

**Vantagens:** separa responsabilidades, permite auditoria, mantém compatibilidade com os módulos atuais e suporta relatórios oficiais salvos.

**Custo:** envolve banco de dados, IPC, formulários e relatório próprios.

## Regras de negócio definidas

### Relação cliente-fornecedor

- Clientes e fornecedores continuam sendo cadastros separados.
- Um fornecedor poderá ser vinculado a um cliente correspondente.
- Esse vínculo identifica a empresa que contrata o frete e fornece o óleo.

### Crédito

- O crédito será controlado em um saldo único por cliente/fornecedor.
- Novos créditos somam ao saldo existente.
- O saldo deverá controlar valor em reais e quantidade de litros.
- O crédito terá data de vencimento/referência de validade.
- O saldo não utilizado será carregado para períodos seguintes, conforme a regra aprovada.

### Valor, litros e preço por litro

Na experiência de lançamento, o usuário informará duas das três informações:

- valor total;
- quantidade de litros;
- preço por litro.

O sistema calculará automaticamente a terceira informação, evitando divergências entre valor e litragem.

### Abastecimento

Todo abastecimento do fornecedor vinculado deverá permitir registrar:

- número do vale;
- litragem;
- valor;
- preço por litro;
- data;
- caminhão;
- fornecedor/cliente relacionado.

Cada abastecimento poderá ser classificado como:

- **Usar crédito:** reduz o saldo de valor e litros e entra como débito de óleo no fechamento;
- **Fluxo normal:** não reduz o crédito e gera uma conta a pagar normal para o fornecedor;
- **Pendente:** fica sem impacto financeiro até ser classificado.

O crédito não será consumido automaticamente. A decisão será feita por abastecimento.

### Fechamento

O usuário escolherá:

- cliente;
- período X dos fretes;
- data de vencimento Y;
- abastecimentos de crédito que compõem o débito de óleo.

O fechamento somará todos os fretes/viagens do cliente no período, independentemente de a conta a receber já ter sido paga.

Fórmula principal:

```text
Valor líquido a receber = total dos fretes do período - óleo abastecido usando crédito
```

O relatório deverá apresentar:

- total dos fretes;
- crédito disponível;
- débito de óleo do fechamento;
- saldo de crédito após o abatimento;
- valor líquido a receber;
- data de vencimento;
- detalhes dos vales e litros utilizados.

O fechamento confirmado deverá ser salvo/congelado, para que alterações futuras em abastecimentos ou viagens não modifiquem um documento já entregue.

## Fluxo operacional proposto

1. Cadastrar a empresa em Clientes e Fornecedores.
2. Vincular o fornecedor ao cliente correspondente.
3. Informar ou atualizar o saldo de crédito em valor e litros.
4. Registrar os abastecimentos com vale, litragem, valor e preço por litro.
5. Classificar cada abastecimento como crédito, fluxo normal ou pendente.
6. Gerar o fechamento escolhendo o período e o vencimento.
7. Conferir o resumo e os abastecimentos detalhados.
8. Confirmar e salvar o fechamento.
9. Exportar o relatório para cobrança.

## Tratamento do histórico

Abastecimentos anteriores à funcionalidade devem permanecer como histórico neutro por padrão: não alteram o saldo e não entram automaticamente em fechamentos novos.

Como possibilidade futura, poderá existir uma ação manual para importar/classificar abastecimentos antigos quando houver necessidade de regularização.

## Impactos técnicos previstos

- Migração SQLite para armazenar o vínculo cliente-fornecedor.
- Estrutura própria para saldo/crédito de óleo.
- Registro da classificação e dos dados de vale no abastecimento.
- Registro dos fechamentos confirmados e seus itens.
- Atualização dos schemas Zod, tipos TypeScript e API preload.
- Novos handlers IPC para crédito, classificação e fechamento.
- Ajustes nas telas de Fornecedores, Custos/Abastecimentos e Contas a Receber.
- Novo relatório PDF de fechamento de cobrança.
- Validações para impedir consumo acima do saldo de valor ou litros, com confirmação explícita para ajustes autorizados.

## Pontos a validar antes da implementação

- Se o saldo vencido deve apenas gerar alerta ou bloquear o uso.
- Se o fechamento pode ser reaberto/cancelado após confirmado.
- Se o abastecimento em fluxo normal deve ser criado imediatamente no contas a pagar ou permanecer pendente até confirmação.
- Se o número do vale deve ser único dentro do fornecedor.
- Se a data de vencimento será uma data do fechamento ou também deverá atualizar contas a receber.

