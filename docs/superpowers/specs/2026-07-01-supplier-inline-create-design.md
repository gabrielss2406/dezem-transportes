# Cadastro automático de fornecedor durante o lançamento

## Contexto e problema

Hoje, ao lançar um abastecimento dentro de uma viagem (`Trips.tsx`) ou ao lançar um custo (`Costs.tsx`), o campo "Fornecedor" é um `Select` estrito vinculado a `supplier_id`, que só aceita fornecedores já cadastrados na tabela `suppliers`. Quando o usuário precisa lançar um fornecedor esporádico (ex: um posto de estrada desconhecido), ele é obrigado a interromper o fluxo, ir até a tela de Fornecedores, cadastrar manualmente (nome, tipo, telefone) e só então voltar para completar o lançamento.

O objetivo é permitir que o usuário digite um nome de fornecedor que ainda não existe, continue o lançamento normalmente, e o sistema crie automaticamente um cadastro parcial (só com o nome) no momento em que o lançamento é salvo — sem exigir uma ação extra de "cadastrar".

## Escopo

Dois pontos de integração, ambos usando hoje o mesmo componente `Select` de `src/renderer/src/components/ui.tsx` vinculado a `supplier_id`:

1. **Diálogo de abastecimento dentro do lançamento de viagem** — `src/renderer/src/pages/Trips.tsx` (~L1281-1301), onde `handleAddStop` consome o `supplier_id` escolhido para adicionar uma linha de abastecimento (`fuel_stops`) à viagem.
2. **Formulário de custos** — `src/renderer/src/pages/Costs.tsx` (~L429-454), campo `supplier_id` do formulário de custo.

Fora de escopo: o campo legado `supplier_id` no nível da própria viagem (`tripSchema`, comentado como "backward compatibility"), e qualquer outro seletor de dado mestre (clientes, produtos, veículos, motoristas) — este design não altera o `Select` genérico.

## Componente novo: `SupplierCombobox`

Novo componente em `src/renderer/src/components/SupplierCombobox.tsx`, independente do `Select` genérico (decisão explícita: não estender o `Select` compartilhado, para não afetar os demais seletores do app, mesmo custando alguma duplicação da lógica de busca/dropdown/teclado).

### Props

```ts
interface SupplierComboboxProps {
  label?: string
  optional?: boolean
  error?: string
  suppliers: Supplier[]           // lista já carregada pela página, como hoje
  value?: number | null           // id do fornecedor já resolvido/selecionado (RHF)
  onChange?: (id: number | null) => void   // chamado só quando um id real é selecionado
  onPendingChange?: (name: string | null) => void // texto livre pendente (fora do RHF)
  onEnterSelect?: () => void       // mesma semântica do Select atual (navegação entre campos)
  placeholder?: string
  className?: string
}

interface SupplierComboboxRef {
  focus: () => void
  open: () => void
}
```

O `value`/`onChange` continuam vinculados normalmente ao `Controller` do react-hook-form (mesmo shape de hoje, `supplier_id: number | undefined`), sem qualquer mudança nos schemas Zod ou no backend. O nome digitado que ainda não corresponde a nenhum fornecedor **não** passa pelo RHF — vive como estado local da página, reportado via `onPendingChange`.

### Estados visuais

- **Fechado, com fornecedor selecionado (tem id):** mostra o nome do fornecedor, igual ao `Select` hoje.
- **Fechado, com texto digitado sem correspondência exata (pendente, sem id):** mostra o texto digitado com uma tag pequena "novo" ao lado (ex: `bg-primary/10 text-primary`), sinalizando que será criado ao salvar.
- **Aberto:** input de busca + lista de sugestões filtradas dos fornecedores existentes (mesmo algoritmo de ranking do `Select` atual). Selecionar uma sugestão (clique ou Enter) define o id normalmente e limpa o estado "pendente".
- **Editar texto após uma seleção prévia:** qualquer digitação manual após ter um fornecedor selecionado invalida a seleção anterior (volta a `id = null`) e passa a tratar o texto como pendente, até nova seleção ou confirmação como texto livre.
- **Tooltip:** ícone de informação (ⓘ) ao lado do label, com texto: *"Digite o nome de um fornecedor existente para selecioná-lo, ou um nome novo — se não for encontrado, um cadastro simples será criado automaticamente ao salvar."*

### Regra de "pendente"

Um valor é considerado pendente quando: não há id selecionado E o texto digitado, após fechar o dropdown (blur/click fora/Tab), não corresponde exatamente (case-insensitive, trim) a nenhum fornecedor da lista `suppliers`. Texto vazio não é pendente (equivale a "nenhum fornecedor", já respeitando `optional`).

## Resolução na hora de salvar (sem duplicar)

A criação real do fornecedor no banco só acontece no momento em que o usuário clica em salvar (viagem ou custo) — antes da validação/submit normal do formulário, sem alterar a lógica de submit já existente.

Fluxo (`resolvePendingSuppliers`, função auxiliar de página, chamada antes de `handleSubmit(onSubmit)`):

1. Coleta todos os campos de fornecedor pendentes da operação atual (na tela de Custos, no máximo um; na tela de Viagens, potencialmente vários — um por linha de abastecimento com fornecedor novo).
2. Para cada nome pendente (normalizado: trim + lowercase para comparação):
   - Procura na lista `suppliers` já carregada por um nome exatamente igual (case-insensitive) → se encontrar, reaproveita o `id` existente, sem criar nada.
   - Senão, procura num cache local desta operação de salvar (nomes já criados nesta mesma resolução) → se encontrar, reaproveita o `id` recém-criado (evita criar duplicado quando duas linhas usam o mesmo nome novo, ex: dois abastecimentos em "Posto Central").
   - Senão, chama `window.api.suppliers.create({ name: nomeOriginal.trim(), type: 'other' })`, guarda o novo `id` no cache local e atualiza o estado `suppliers` da página (para refletir na UI imediatamente).
3. Preenche cada campo `supplier_id` do formulário (via `setValue`) com o id resolvido correspondente.
4. Segue o fluxo de submit já existente (`handleSubmit(onSubmit)`), que passa a validar normalmente pois todos os `supplier_id` já são números.

Erro na criação (ex: falha de IPC): mostra Toast de erro (padrão já usado nas páginas) e **não** prossegue com o salvamento do formulário principal.

### Fornecedor criado automaticamente

- `name`: texto digitado (trim)
- `type`: `'other'` (fixo, cadastro parcial)
- `phone`: não preenchido
- `customId`: não preenchido (segue o comportamento padrão de criação manual)

O usuário pode completar os dados (tipo, telefone) depois na tela de Fornecedores.

## Integração nos pontos existentes

- **`Trips.tsx`:** troca o `Select` do diálogo de abastecimento (~L1281) por `SupplierCombobox`. Mantém estado local por linha de abastecimento para o nome pendente (indexado pela chave da linha no `useFieldArray`). Antes do submit da viagem, roda `resolvePendingSuppliers` sobre todas as linhas de `fuel_stops` pendentes.
- **`Costs.tsx`:** troca o `Select` do campo `supplier_id` (~L430-454) por `SupplierCombobox`, com um único estado local de nome pendente. Antes do submit do custo, roda `resolvePendingSuppliers` sobre esse único campo (se pendente).

Nenhuma mudança em `src/main/database.ts`, `src/shared/schemas.ts`, `src/shared/types.ts` ou nos handlers IPC de `suppliers` — reaproveita `suppliers:create` como já existe.

## Fora de escopo (não incluído neste design)

- Edição em massa ou indicação visual permanente (ex: badge na tela de Fornecedores) para identificar fornecedores criados automaticamente — o cadastro criado é indistinguível de um cadastro manual com apenas o nome preenchido.
- Qualquer alteração no `Select` genérico ou em outros seletores de dado mestre (clientes, produtos, veículos, motoristas).
- O campo legado de fornecedor no nível da viagem (`trips.supplier_id`).
