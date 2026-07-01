# Cadastro automático de fornecedor durante o lançamento - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to type free-text supplier names in trip fuel stops and cost forms; auto-create partial supplier records on save with dedup protection.

**Architecture:** New `SupplierCombobox` component with search + pending state (name without id). On save, resolve pending names to existing or newly-created suppliers before submitting the form. Two integration points: Trips.tsx (fuel stops) and Costs.tsx (cost form).

**Tech Stack:** React, TypeScript, React Hook Form, Tailwind CSS, existing `window.api.suppliers.create` IPC.

## Global Constraints

- No schema changes in Zod (`src/shared/schemas.ts`), database (`src/main/database.ts`), or IPC handlers.
- Reuse existing `suppliers.create` handler (name + type='other').
- `SupplierCombobox` is independent from the generic `Select` component; no changes to `ui.tsx`.
- Dedup names case-insensitively (trim) both against existing suppliers and within the same save operation.
- Toast error if creation fails; do not proceed with form submit.

---

## File Structure

**Create:**
- `src/renderer/src/components/SupplierCombobox.tsx` — New combobox with search, pending state, and tooltip.

**Modify:**
- `src/renderer/src/pages/Trips.tsx` — Replace fuel-stop supplier `Select` with `SupplierCombobox`; add `resolvePendingSuppliers` before submit.
- `src/renderer/src/pages/Costs.tsx` — Replace supplier `Select` with `SupplierCombobox`; add `resolvePendingSuppliers` before submit.

---

### Task 1: Create SupplierCombobox component (base structure + search)

**Files:**
- Create: `src/renderer/src/components/SupplierCombobox.tsx`

**Interfaces:**
- Consumes: `Supplier` type from `src/renderer/src/lib/types.ts`
- Produces: `SupplierCombobox` React component (forwardRef) with props interface `SupplierComboboxProps` and ref interface `SupplierComboboxRef`

- [ ] **Step 1: Create the file with base structure**

```tsx
import React, { useState, useRef, useEffect, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import type { Supplier } from '../lib/types'

export interface SupplierComboboxRef {
  focus: () => void
  open: () => void
}

export interface SupplierComboboxProps {
  label?: string
  optional?: boolean
  error?: string
  suppliers: Supplier[]
  value?: number | null
  onChange?: (id: number | null) => void
  onPendingChange?: (name: string | null) => void
  onEnterSelect?: () => void
  placeholder?: string
  className?: string
}

export const SupplierCombobox = React.forwardRef<SupplierComboboxRef, SupplierComboboxProps>(
  (
    {
      label,
      optional,
      error,
      suppliers,
      value,
      onChange,
      onPendingChange,
      onEnterSelect,
      placeholder = 'Selecione...',
      className = '',
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [pendingName, setPendingName] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    const uniqueId = useRef(Math.random())
    const id = React.useId()

    useImperativeHandle(ref, () => ({
      focus: () => buttonRef.current?.focus(),
      open: () => {
        setIsOpen(true)
        document.dispatchEvent(
          new CustomEvent('close-other-suppliercombobox', { detail: { id: uniqueId.current } }),
        )
      },
    }))

    useEffect(() => {
      const handleClose = (e: CustomEvent) => {
        if (e.detail.id !== uniqueId.current) {
          setIsOpen(false)
        }
      }
      document.addEventListener('close-other-suppliercombobox', handleClose as EventListener)
      return () => {
        document.removeEventListener('close-other-suppliercombobox', handleClose as EventListener)
      }
    }, [])

    const selectedOption = suppliers.find((s) => s.id === value)

    const getSearchableLabel = (supplier: Supplier): string => {
      return `${supplier.name} ${supplier.customId || ''}`.trim()
    }

    const filteredSuppliers = suppliers
      .filter((s) => getSearchableLabel(s).toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aLabel = getSearchableLabel(a).toLowerCase()
        const bLabel = getSearchableLabel(b).toLowerCase()
        const lowerSearchTerm = searchTerm.toLowerCase()

        if (aLabel === lowerSearchTerm && bLabel !== lowerSearchTerm) return -1
        if (aLabel !== lowerSearchTerm && bLabel === lowerSearchTerm) return 1

        const aWords = aLabel.split(' ')
        const bWords = bLabel.split(' ')
        const aMatches = aWords.filter((w) => w.startsWith(lowerSearchTerm))
        const bMatches = bWords.filter((w) => w.startsWith(lowerSearchTerm))

        if (aMatches.length > 0 && bMatches.length === 0) return -1
        if (aMatches.length === 0 && bMatches.length > 0) return 1

        if (aMatches.length > 0 && bMatches.length > 0) {
          const aMin = Math.min(...aMatches.map((w) => w.length))
          const bMin = Math.min(...bMatches.map((w) => w.length))
          if (aMin < bMin) return -1
          if (aMin > bMin) return 1
        }

        return aLabel.localeCompare(bLabel)
      })

    const updateCoords = React.useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }, [])

    useEffect(() => {
      if (isOpen) {
        updateCoords()
        window.addEventListener('resize', updateCoords)
        window.addEventListener('scroll', updateCoords, true)
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
          }
        }, 50)
        setSearchTerm('')
        setHighlightedIndex(0)
      }
      return () => {
        window.removeEventListener('resize', updateCoords)
        window.removeEventListener('scroll', updateCoords, true)
      }
    }, [isOpen, updateCoords])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          finalizePendingName()
        }
      }
      if (isOpen) {
        document.addEventListener('click', handleClickOutside)
      }
      return () => document.removeEventListener('click', handleClickOutside)
    }, [isOpen, searchTerm])

    const finalizePendingName = () => {
      if (searchTerm.trim() === '') {
        setPendingName(null)
        onPendingChange?.(null)
      } else {
        const exactMatch = suppliers.some(
          (s) => s.name.toLowerCase().trim() === searchTerm.toLowerCase().trim(),
        )
        if (!exactMatch && value === undefined && searchTerm.trim().length > 0) {
          setPendingName(searchTerm.trim())
          onPendingChange?.(searchTerm.trim())
        } else if (exactMatch || value !== undefined) {
          setPendingName(null)
          onPendingChange?.(null)
        }
      }
    }

    const handleSearchChange = (newTerm: string) => {
      setSearchTerm(newTerm)
      setHighlightedIndex(0)
      onChange?.(undefined)
      setPendingName(null)
      onPendingChange?.(null)
    }

    const handleSelectOption = (supplier: Supplier) => {
      onChange?.(supplier.id)
      setPendingName(null)
      onPendingChange?.(null)
      setIsOpen(false)
      setSearchTerm('')
    }

    const displayValue = selectedOption
      ? selectedOption.name
      : pendingName
        ? pendingName
        : ''

    return (
      <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
        {label && (
          <div className="flex items-center gap-1">
            <label
              htmlFor={id}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {label}{' '}
              {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
            </label>
            <span
              className="cursor-help text-on-surface-variant/60 text-sm"
              title="Digite o nome de um fornecedor existente para selecioná-lo, ou um nome novo — se não for encontrado, um cadastro simples será criado automaticamente ao salvar."
            >
              ⓘ
            </span>
          </div>
        )}

        <button
          id={id}
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const newIsOpen = !isOpen
            setIsOpen(newIsOpen)
            if (newIsOpen) {
              document.dispatchEvent(
                new CustomEvent('close-other-suppliercombobox', { detail: { id: uniqueId.current } }),
              )
            }
          }}
          className={`flex items-center justify-between bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${error ? 'border-error' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={`truncate flex items-center gap-2 ${!displayValue ? 'text-on-surface-variant/40' : ''}`}>
              {displayValue || placeholder}
              {pendingName && (
                <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded whitespace-nowrap">
                  novo
                </span>
              )}
            </span>
          </div>
          <span
            className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>

        {isOpen &&
          createPortal(
            <button
              type="button"
              className="fixed z-[9999] bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                top: coords.top + 4,
                left: coords.left,
                width: coords.width,
              }}
            >
              <div className="p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setHighlightedIndex((prev) =>
                        prev < filteredSuppliers.length - 1 ? prev + 1 : prev,
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
                    } else if (e.key === 'Enter' && filteredSuppliers.length > 0) {
                      e.preventDefault()
                      handleSelectOption(filteredSuppliers[highlightedIndex])
                      onEnterSelect?.()
                    }
                  }}
                  onBlur={finalizePendingName}
                  placeholder="Pesquisar..."
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {optional && searchTerm.length === 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange?.(undefined)
                      setPendingName(null)
                      onPendingChange?.(null)
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 text-on-surface-variant italic"
                  >
                    Limpar
                  </button>
                )}
                {filteredSuppliers.map((supplier, index) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelectOption(supplier)
                      onEnterSelect?.()
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      index === highlightedIndex
                        ? 'bg-primary/20 text-on-surface'
                        : 'hover:bg-primary/10 text-on-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{supplier.name}</span>
                      {supplier.customId && (
                        <span className="text-on-surface-variant/50 text-xs">#{supplier.customId}</span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredSuppliers.length === 0 && searchTerm.trim().length > 0 && (
                  <div className="px-4 py-2.5 text-sm text-on-surface-variant/60 italic">
                    Nenhum fornecedor encontrado
                  </div>
                )}
              </div>
            </button>,
            document.body,
          )}

        {error && <span className="text-[10px] text-error">{error}</span>}
      </div>
    )
  },
)

SupplierCombobox.displayName = 'SupplierCombobox'
```

- [ ] **Step 2: Run type-check to verify it compiles**

```bash
npm run type-check
```

Expected: No errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/SupplierCombobox.tsx
git commit -m "feat: add SupplierCombobox component with search and pending state"
```

---

### Task 2: Integrate SupplierCombobox into Costs.tsx

**Files:**
- Modify: `src/renderer/src/pages/Costs.tsx` (replace Select with SupplierCombobox, add resolvePendingSuppliers)

**Interfaces:**
- Consumes: `SupplierCombobox` from `src/renderer/src/components/SupplierCombobox.tsx`
- Produces: Modified form that supports pending supplier names and resolves them on submit

- [ ] **Step 1: Read Costs.tsx to understand the current supplier handling**

```bash
grep -n "supplier" src/renderer/src/pages/Costs.tsx | head -20
```

Find the line range of the supplier Select component (~L430-454 from spec).

- [ ] **Step 2: Add import for SupplierCombobox at the top of Costs.tsx**

After existing imports, add:

```tsx
import { SupplierCombobox } from '../components/SupplierCombobox'
```

- [ ] **Step 3: Add state for pending supplier name**

Inside the `Costs` component, after the existing state declarations (after `setSuppliers`, etc.), add:

```tsx
const [pendingSupplierName, setPendingSupplierName] = useState<string | null>(null)
```

- [ ] **Step 4: Create resolvePendingSuppliers helper function**

Inside the `Costs` component, before the submit handler, add this function:

```tsx
const resolvePendingSuppliers = async (): Promise<boolean> => {
  if (!pendingSupplierName) return true

  const normalizedPending = pendingSupplierName.toLowerCase().trim()
  const existing = suppliers.find(
    (s) => s.name.toLowerCase().trim() === normalizedPending,
  )

  if (existing) {
    // Reuse existing supplier
    setValue('supplier_id', existing.id)
    setPendingSupplierName(null)
    return true
  }

  // Create new supplier
  try {
    const created = await window.api.suppliers.create({
      name: pendingSupplierName.trim(),
      type: 'other',
    })

    if (!created.ok) {
      showErrorToast('Erro ao criar fornecedor')
      return false
    }

    // Update local suppliers list
    setSuppliers([...suppliers, created.data])
    setValue('supplier_id', created.data.id)
    setPendingSupplierName(null)
    return true
  } catch (err) {
    showErrorToast('Erro ao criar fornecedor')
    return false
  }
}
```

(Note: `showErrorToast` must match the existing pattern in Costs.tsx; use `Toast.error()` or whatever pattern is used there.)

- [ ] **Step 5: Find and modify the form submit handler**

Locate the `handleSubmit(onSubmit)` call (search for `handleSubmit`). Change it to:

```tsx
const onSubmitWithPendingResolve = async (data: z.infer<typeof costSchema>) => {
  const resolved = await resolvePendingSuppliers()
  if (!resolved) return
  await onSubmit(data)
}
```

Then update the form's `onSubmit` to use `handleSubmit(onSubmitWithPendingResolve)`.

- [ ] **Step 6: Replace the Select component for supplier_id with SupplierCombobox**

Find the supplier Select block (~L430-454) and replace it entirely with:

```tsx
<Controller
  name="supplier_id"
  control={control}
  render={({ field }) => (
    <SupplierCombobox
      label="Fornecedor"
      optional
      value={field.value}
      onChange={field.onChange}
      onPendingChange={setPendingSupplierName}
      onEnterSelect={() => driverSelectRef.current?.open()}
      error={errors.supplier_id?.message}
      suppliers={suppliers}
    />
  )}
/>
```

- [ ] **Step 7: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 8: Test manually in dev mode**

```bash
npm run dev
```

Navigate to Costs page, try:
1. Type an existing supplier name → should autocomplete and show the supplier
2. Type a new supplier name (not in list) → should show "novo" tag
3. Click Save → should create the supplier and link the cost

- [ ] **Step 9: Commit**

```bash
git add src/renderer/src/pages/Costs.tsx
git commit -m "feat: integrate SupplierCombobox in Costs form with auto-creation on save"
```

---

### Task 3: Integrate SupplierCombobox into Trips.tsx (fuel stops)

**Files:**
- Modify: `src/renderer/src/pages/Trips.tsx` (replace Select with SupplierCombobox in fuel-stop modal, add resolvePendingSuppliers)

**Interfaces:**
- Consumes: `SupplierCombobox` from `src/renderer/src/components/SupplierCombobox.tsx`
- Produces: Modified trip form that supports pending supplier names in fuel stops

- [ ] **Step 1: Add import for SupplierCombobox**

At the top of Trips.tsx, add:

```tsx
import { SupplierCombobox } from '../components/SupplierCombobox'
```

- [ ] **Step 2: Add state for pending supplier names per fuel stop**

Inside the `Trips` component, after existing state declarations, add:

```tsx
const [pendingSupplierNamesByStopIndex, setPendingSupplierNamesByStopIndex] = useState<
  Record<number, string | null>
>({})
```

This maps fuel-stop index to pending name.

- [ ] **Step 3: Create resolvePendingSuppliers helper for Trips**

Inside the `Trips` component, before the submit handler, add:

```tsx
const resolvePendingSuppliers = async (): Promise<boolean> => {
  const fuelStops = getValues('fuel_stops') || []
  const createdSupplierCache: Record<string, number> = {}

  for (let i = 0; i < fuelStops.length; i++) {
    const pendingName = pendingSupplierNamesByStopIndex[i]
    if (!pendingName) continue

    const normalizedPending = pendingName.toLowerCase().trim()

    // Check existing suppliers
    const existing = suppliers.find(
      (s) => s.name.toLowerCase().trim() === normalizedPending,
    )

    if (existing) {
      setValue(`fuel_stops.${i}.supplier_id`, existing.id)
      setPendingSupplierNamesByStopIndex((prev) => {
        const next = { ...prev }
        delete next[i]
        return next
      })
      continue
    }

    // Check cache for suppliers created in this batch
    if (createdSupplierCache[normalizedPending]) {
      setValue(`fuel_stops.${i}.supplier_id`, createdSupplierCache[normalizedPending])
      setPendingSupplierNamesByStopIndex((prev) => {
        const next = { ...prev }
        delete next[i]
        return next
      })
      continue
    }

    // Create new supplier
    try {
      const created = await window.api.suppliers.create({
        name: pendingName.trim(),
        type: 'other',
      })

      if (!created.ok) {
        showErrorToast('Erro ao criar fornecedor')
        return false
      }

      createdSupplierCache[normalizedPending] = created.data.id
      setSuppliers([...suppliers, created.data])
      setValue(`fuel_stops.${i}.supplier_id`, created.data.id)
      setPendingSupplierNamesByStopIndex((prev) => {
        const next = { ...prev }
        delete next[i]
        return next
      })
    } catch (err) {
      showErrorToast('Erro ao criar fornecedor')
      return false
    }
  }

  return true
}
```

- [ ] **Step 4: Find the fuel-stop dialog and its handleAddStop**

Search for `handleAddStop` in Trips.tsx. Note its current implementation (~L368-375 from spec).

- [ ] **Step 5: Find the supplier Select in the fuel-stop modal**

Locate the fuel-stop dialog JSX (search for "Abastecimento" or similar label). Find the supplier Select (~L1281-1301 from spec).

- [ ] **Step 6: Replace the supplier Select with SupplierCombobox in the modal**

Replace the Select component for supplier selection in the fuel-stop modal with:

```tsx
<SupplierCombobox
  label="Fornecedor"
  value={fuelStopFormData.supplier_id}
  onChange={(id) => setFuelStopFormData({ ...fuelStopFormData, supplier_id: id })}
  onPendingChange={(name) => {
    // Store pending name using a temporary key (e.g., current field count)
    // We'll map this to the actual array index once the stop is added
  }}
  error=""
  suppliers={suppliers}
/>
```

(Note: This requires careful coordination with `handleAddStop` — see next step.)

- [ ] **Step 7: Update handleAddStop to track pending supplier names**

Modify `handleAddStop` to store the pending supplier name when adding a new fuel stop:

```tsx
const handleAddStop = () => {
  if (!fuelStopFormData.supplier_id && !fuelStopFormData.supplier_name) {
    showErrorToast('Selecione ou digite um fornecedor')
    return
  }

  // If there's a pending name (no id yet), store it for resolution later
  const currentFuelStops = getValues('fuel_stops') || []
  const newIndex = currentFuelStops.length

  if (fuelStopFormData.supplier_id) {
    append({
      supplier_id: fuelStopFormData.supplier_id,
      value: fuelStopFormData.value || 0,
      liters: fuelStopFormData.liters,
      km_driven: fuelStopFormData.km_driven,
    })
    setPendingSupplierNamesByStopIndex((prev) => {
      const next = { ...prev }
      delete next[newIndex]
      return next
    })
  } else if (fuelStopFormData.supplier_name) {
    // Pending name, will be resolved on save
    setPendingSupplierNamesByStopIndex((prev) => ({
      ...prev,
      [newIndex]: fuelStopFormData.supplier_name,
    }))
    append({
      supplier_id: undefined, // Will be filled during resolvePendingSuppliers
      value: fuelStopFormData.value || 0,
      liters: fuelStopFormData.liters,
      km_driven: fuelStopFormData.km_driven,
    })
  }

  setFuelStopFormData({ ...defaultFuelStopFormData })
  setFuelStopModalOpen(false)
}
```

(Note: This assumes `fuelStopFormData` has a `supplier_name` field for pending text. Adjust based on actual Trips.tsx structure.)

- [ ] **Step 8: Update the form submit handler**

Find the trip submit handler. Wrap it to call `resolvePendingSuppliers` first:

```tsx
const onSubmitWithPendingResolve = async (data: z.infer<typeof tripSchema>) => {
  const resolved = await resolvePendingSuppliers()
  if (!resolved) return
  await onSubmit(data)
}
```

Update the form's `onSubmit` to: `handleSubmit(onSubmitWithPendingResolve)`.

- [ ] **Step 9: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 10: Test manually in dev mode**

```bash
npm run dev
```

Navigate to Trips page, create a new trip:
1. Open fuel-stop modal
2. Type a new supplier name (not in list) → should show "novo" tag
3. Add the fuel stop
4. Repeat with same name → should reuse pending name, not duplicate
5. Click Save Trip → should create one supplier (not duplicated)

- [ ] **Step 11: Commit**

```bash
git add src/renderer/src/pages/Trips.tsx
git commit -m "feat: integrate SupplierCombobox in Trips fuel stops with auto-creation on save"
```

---

### Task 4: Final verification and edge cases

**Files:**
- Verify: `src/renderer/src/components/SupplierCombobox.tsx`
- Verify: `src/renderer/src/pages/Trips.tsx`
- Verify: `src/renderer/src/pages/Costs.tsx`

**Interfaces:**
- Consumes: All previously-implemented components and logic
- Produces: Verified, working implementation

- [ ] **Step 1: Run full type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No new errors.

- [ ] **Step 3: Start dev server and test both flows**

```bash
npm run dev
```

Test in Costs page:
- Scenario A: Type existing supplier name → autocomplete shows it → click → save → should link existing supplier
- Scenario B: Type new supplier name → "novo" tag appears → save → should create supplier + link

Test in Trips page:
- Scenario C: Add fuel stop with new supplier "Posto A" → add another with "Posto A" → save → should create only 1 supplier
- Scenario D: Add fuel stop with new "Posto B", close dialog, edit and change to existing supplier → save → should use existing

Test error cases:
- Scenario E: Type new supplier, try to save when IPC is broken → should show error toast and not save trip

- [ ] **Step 4: Verify no regressions**

Test that normal (existing) supplier selection still works in both pages with no changes in behavior.

- [ ] **Step 5: Commit verification checklist**

```bash
git log --oneline | head -5
```

Should see 4 recent commits:
1. Integrate SupplierCombobox in Trips
2. Integrate SupplierCombobox in Costs
3. Add SupplierCombobox component

All passes type-check, lint, and manual tests.

