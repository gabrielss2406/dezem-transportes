# Issues Resolvidas

Histórico de issues que foram resolvidas no projeto.

## Status

- **#45** ✅ — [FIX] Unidade do produto sempre é tonelada
- **#61** ✅ — [FIX] Seleção de caminhões terceirizados no cadastro de motorista
  - Bug: dropdown de caminhões mostrava apenas caminhões próprios ao ativar toggle terceirizado
  - Causa: `availableTrucks` filtrava pelo estado da aba (`view`) em vez do campo do formulário (`isOutsourcedValue`)
  - Solução: alterar filtro para usar `isOutsourcedValue` garantindo sincronização com o toggle do formulário
  - Arquivo modificado: Drivers.tsx (1 linha)
- **#46** ✅ — Inicializar campo de data com a data atual do sistema
  - Adicionado função `today()` em utils.ts que retorna `yyyy-mm-dd`
  - Atualizado EMPTY constant em Trips.tsx para usar `today()`
  - Atualizado EMPTY constant em Costs.tsx para usar `today()`
  - Campos de data agora abrem pré-preenchidos com o dia atual
  - Arquivos modificados: utils.ts, Trips.tsx, Costs.tsx
- **#50** ✅ — [FIX] Modelo opcional no caminhão
  - Bug: campo de modelo ainda exigia preenchimento mesmo marcado como opcional
  - Causas múltiplas:
    1. Schema Zod não tinha `z.preprocess()` para converter strings vazias
    2. Banco de dados tinha coluna `model` como `NOT NULL`
  - Solução:
    1. Alterado schema de `model: z.string().max(50).optional()` para `z.preprocess() + z.string().max(50).optional().nullable()`
    2. Alterado coluna do banco de `TEXT NOT NULL` para `TEXT` (permitindo NULL)
    3. Adicionada migração para converter bases existentes
  - Arquivos modificados: schemas.ts, database.ts
- **#53** ✅ — [FIX] Remover arredondamento das medidas de tonelagem
- **#55** ✅ — Filtro por caminhão na página de custos
  - Adicionado Select de filtro na página de Custos que passa `truck_id` ao backend
  - O backend (`costs:list`) já estava preparado para receber o filtro
  - Funciona em combinação com o filtro de categoria existente
- **#58** ✅ — Mostrar contagem de lançamentos por caminhão no período filtrado (com toggle)
  - Adicionado cálculo client-side `perTruck` que agrupa lançamentos por `truck_id`
  - Adicionado estado `showTruckBreakdown` para controlar visibilidade
  - Botão toggle "Ver/Ocultar por caminhão" exibe chips apenas quando acionado
  - Chips mostram placa + contagem, ordenados por quantidade decrescente
  - Aparecem apenas quando há mais de um caminhão no resultado
  - Contagens são dinâmicas e refletem os filtros aplicados
  - Arquivo modificado: Trips.tsx
- **#59** ✅ — Renomear "Viagens" para "Lançamentos"
  - Alterado label de navegação no Sidebar
  - Alterado títulos e botões na página de Trips
  - Alterado labels no Overview e Dashboard
  - Alterado mensagens de confirmação, toasts e modal titles
  - Alterado nomes de arquivos PDF de relatório
  - Arquivos modificados: Sidebar.tsx, Trips.tsx, Overview.tsx, Dashboard.tsx, DesignSystem.tsx
