# Manutenção retroativa com km da época — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir lançar manutenção com o km da data do serviço (menor que o km atual do caminhão), trocando o bloqueio por um aviso não bloqueante.

**Architecture:** Função pura em `src/shared/` compara o km informado com as leituras (abastecimentos e manutenções) do caminhão ao redor da data. Um handler IPC devolve as leituras; o modal mostra o aviso e oferece "Salvar mesmo assim". O handler `createRecord` deixa de rejeitar km menor que o atual.

**Tech Stack:** Electron IPC, better-sqlite3, React + react-hook-form, Zod, `tsx` para o script de teste.

**Spec:** requisitos aprovados em `/home/evaldo/.claude/plans/cria-uma-skill-para-resilient-book.md` (RF-01..05, RN-01..04, CA-01..05).

## Global Constraints

- Nunca bloquear por km vs. histórico/km atual (RF-01, RF-03, RF-04).
- Km obrigatório para `tracks_mileage = 1` e máximo 9.999.999 permanecem (RF-05).
- `trucks.current_odometer` não muda ao salvar manutenção (RN-02).
- Sem migração de banco. Textos de UI em pt-BR.
- Referências do aviso: `fuel_records.odometer_at_service` e `maintenance_records.odometer_at_service` não nulos; viagens não entram.

## Review Focus

- Data anterior a qualquer leitura (sem "anterior"): só compara com a próxima, sem erro.
- Caminhão sem leituras: nenhum aviso.
- Mesma data de um abastecimento: ele conta como anterior.
- Km igual ao de referência: sem aviso.
- Km maior que `current_odometer`: dashboard não mostra `km_since_last` negativo.

## File Structure

- Create `src/shared/maintenanceOdometer.ts` — tipos e `getOdometerWarning` (puro).
- Create `scripts/test-maintenance-odometer.ts` — testes; script `test:maintenance-odometer` no `package.json`.
- Modify `src/main/modules/maintenance/maintenance.handlers.ts` — remover bloqueio (:199-213), clamp em :48-49, novo handler `maintenance:getOdometerReadings`.
- Modify `src/preload/index.ts:107-116` e `src/renderer/src/lib/types.ts:489` — expor `getOdometerReadings`.
- Modify `src/renderer/src/pages/Maintenance.tsx` — remover bloqueio (:243-252), aviso + confirmação em `saveRecord` (:228).

---

### Task 1: Regra pura de aviso de km

**Files:**
- Create: `src/shared/maintenanceOdometer.ts`
- Create: `scripts/test-maintenance-odometer.ts`
- Modify: `package.json` (script `test:maintenance-odometer`: `npx --yes tsx scripts/test-maintenance-odometer.ts`, ao lado de `test:oil-credits`)

**Interfaces:**
- Produces:
  - `type OdometerReading = { date: string; odometer: number; source: 'fuel' | 'maintenance' }` (`date` = `YYYY-MM-DD`)
  - `type OdometerWarning = { kind: 'below_previous' | 'above_next'; reference: OdometerReading }`
  - `getOdometerWarning(readings: OdometerReading[], date: string, odometer: number): OdometerWarning | null`

Regra: anterior = leituras com `date <= data`, da data mais recente (empate: maior km); próxima = leituras com `date > data`, da data mais antiga (empate: menor km). `below_previous` se `odometer < anterior.odometer`; senão `above_next` se `odometer > próxima.odometer`; senão `null`. Entrada não ordenada deve funcionar.

- [ ] **Step 1: Escrever o teste falhando** em `scripts/test-maintenance-odometer.ts` (estilo `assert/strict` de `scripts/test-oil-credits.ts`), com leituras `{2026-11-18, 9800, fuel}` e `{2026-11-21, 10500, fuel}`:
  - data `2026-11-20`, km 10000 → `null` (CA-03)
  - data `2026-11-20`, km 9000 → `{ kind: 'below_previous', reference: leitura de 9800 }` (CA-02)
  - data `2026-11-20`, km 11000 → `{ kind: 'above_next', reference: leitura de 10500 }`
  - data `2026-11-18`, km 9800 → `null` (igual, mesma data)
  - data `2026-11-10`, km 5000 → `null` (sem anterior, 5000 ≤ 9800)
  - data `2026-11-10`, km 9900 → `above_next` com referência 9800
  - lista vazia → `null`
  - entrada em ordem invertida dá o mesmo resultado do primeiro caso
- [ ] **Step 2: Rodar** `npm run test:maintenance-odometer` — esperado: falha por módulo inexistente.
- [ ] **Step 3: Implementar** `getOdometerWarning` e os tipos em `src/shared/maintenanceOdometer.ts` conforme a regra acima.
- [ ] **Step 4: Rodar** `npm run test:maintenance-odometer` — esperado: sai com código 0, sem asserts falhos.
- [ ] **Step 5: Commit** `feat: regra de aviso de km em manutenção retroativa`

---

### Task 2: Backend sem bloqueio + leituras do caminhão

**Files:**
- Modify: `src/main/modules/maintenance/maintenance.handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/lib/types.ts` (namespace `maintenance`, ~:489)

**Interfaces:**
- Consumes: `OdometerReading` (Task 1).
- Produces: `window.api.maintenance.getOdometerReadings(truckId: number): Promise<OdometerReading[]>`, canal IPC `maintenance:getOdometerReadings`.

- [ ] **Step 1: Remover o bloqueio** `odometer < truck.current_odometer` em `maintenance:createRecord` (:199-213), inclusive a consulta a `trucks`. As validações de km obrigatório (:189-197) ficam.
- [ ] **Step 2: Clamp (RN-04)** em `getMaintenanceStatus` (:48-49): `km_since_last = Math.max(0, truck.current_odometer - lastRecord.odometer_at_service)`.
- [ ] **Step 3: Novo handler** `maintenance:getOdometerReadings` (`ipcMain.handle`, arg `truckId: number`): `UNION ALL` de `fuel_records` (`source: 'fuel'`) e `maintenance_records` (`source: 'maintenance'`) do `truck_id`, apenas `odometer_at_service IS NOT NULL`, colunas `date, odometer_at_service AS odometer, source`.
- [ ] **Step 4: Expor** no preload (`getOdometerReadings: (truckId: number) => ipcRenderer.invoke('maintenance:getOdometerReadings', truckId)`) e tipar em `types.ts` com `OdometerReading` importado de `shared/maintenanceOdometer`.
- [ ] **Step 5: Rodar** `npm run type-check` — esperado: sem erros.
- [ ] **Step 6: Commit** `feat: permitir manutenção com km retroativo e expor leituras do caminhão`

---

### Task 3: Aviso e confirmação no modal

**Files:**
- Modify: `src/renderer/src/pages/Maintenance.tsx` (`saveRecord` :228-274, JSX do campo `odometer_at_service`)

**Interfaces:**
- Consumes: `getOdometerWarning`, `OdometerWarning` (Task 1); `window.api.maintenance.getOdometerReadings` (Task 2).

- [ ] **Step 1: Remover o bloqueio de frontend** (:243-252); manter o de km obrigatório (:236-242).
- [ ] **Step 2: Estado** `odometerWarning: OdometerWarning | null`, limpo ao abrir/fechar o modal e quando `truck_id`, `date` ou `odometer_at_service` mudam.
- [ ] **Step 3: Alterar assinatura** para `saveRecord(data: RecordFormData, confirmed = false)`. Se `odometer != null && !confirmed`: buscar leituras do caminhão, calcular `getOdometerWarning(readings, data.date, odometer)`; se houver aviso, `setOdometerWarning(...)`, `setPendingRecord(null)` e retornar sem salvar.
- [ ] **Step 4: Exibir o aviso** (estilo de alerta amarelo já usado em `components/ui.tsx`, abaixo do campo km) com o texto: `Km menor que o último registro (<km> km em <dd/mm/aaaa>, <abastecimento|manutenção>).` para `below_previous`, e `Km maior que o próximo registro (...)` para `above_next`, e um botão "Salvar mesmo assim" que chama `saveRecord(getValues(), true)`. O "Registrar" normal continua disponível e reabre o aviso.
- [ ] **Step 5: Rodar** `npm run type-check` e `npm run lint` — esperado: sem erros.
- [ ] **Step 6: Verificação manual** em `npm run dev` (caminhão com abastecimentos dia 18 km 9.800 e dia 21 km 10.500):
  - manutenção dia 20 km 10.000 salva direto (CA-01, CA-03);
  - dia 20 km 9.000 mostra aviso com 9.800; "Salvar mesmo assim" salva (CA-02);
  - `current_odometer` do caminhão segue 10.500 (CA-04);
  - manutenção com km 12.000 não deixa `km_remaining` maior que o intervalo no Dashboard (CA-05).
- [ ] **Step 7: Commit** `feat: aviso não bloqueante de km na manutenção`
