import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { costSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import {
  Button,
  ConfirmModal,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  Select,
  type SelectRef,
  Toast,
  useToast,
} from '../components/ui'
import type { Cost, Driver, Supplier, Truck } from '../lib/types'
import { currentMonthKey, formatBRL, formatDate } from '../lib/utils'

interface CostFormData {
  date: string
  category: string
  value: number
  truck_id: number | null
  supplier_id: number | null
  driver_id: number | null
  description?: string
}

const EMPTY: CostFormData = {
  date: '',
  category: '',
  value: 0,
  truck_id: null,
  supplier_id: null,
  driver_id: null,
  description: '',
}

const categoryBadge: Record<string, string> = {
  fuel: 'bg-secondary-container text-on-secondary-container',
  oil: 'bg-secondary-container text-on-secondary-container',
  maintenance: 'bg-tertiary-container/30 text-tertiary',
  salary: 'bg-primary/10 text-primary',
  toll: 'bg-surface-container-highest text-on-surface-variant',
  others: 'bg-surface-container-highest text-on-surface-variant',
}

export function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [costCategories, setCostCategories] = useState<{ value: string; label: string }[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [modal, setModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTruckId, setFilterTruckId] = useState('')
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Cost | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  // Refs para navegação por teclado
  const categorySelectRef = useRef<SelectRef>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const truckSelectRef = useRef<SelectRef>(null)
  const supplierSelectRef = useRef<SelectRef>(null)
  const driverSelectRef = useRef<SelectRef>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<CostFormData>({
    resolver: zodResolver(costSchema) as any,
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(async () => {
    const [c, cc, tr, s, d] = await Promise.all([
      window.api.costs.list({ truck_id: filterTruckId || undefined }),
      window.api['cost-categories'].list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list(),
    ])
    setCosts(c)
    setCostCategories(cc)
    setTrucks(tr)
    setSuppliers(s)
    setDrivers(d)
  }, [filterTruckId])

  useEffect(() => {
    load()
  }, [load])

  // Foco inicial e limpeza
  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        categorySelectRef.current?.open()
      }, 200)
    } else {
      reset(EMPTY)
    }
  }, [modal, reset])

  const save = async (data: CostFormData) => {
    try {
      await window.api.costs.create(data as any)
      show('Custo lançado!')
      setModal(false)
      setPendingData(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro ao lançar custo', 'error')
    }
  }

  const onSubmit = (data: CostFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: CostFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.costs.delete(deleteTarget.id)
    show('Custo excluído')
    setDeleteTarget(null)
    load()
  }

  const handleEscape = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      setModal(false)
    }
  }

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false)
    setModal(false)
  }

  async function issueSalaries() {
    const month = currentMonthKey()
    const r = await window.api.costs.issueMonthlySalaries(month)
    show(r.issued > 0 ? `${r.issued} salário(s) lançado(s)!` : 'Salários já lançados neste mês')
    load()
  }

  const total = costs.reduce((s, c) => s + c.value, 0)
  const filtered = filterCategory ? costs.filter((c) => c.category === filterCategory) : costs

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Financeira"
        title="Custos da Frota"
        subtitle="Gerencie as despesas operacionais com precisão."
      >
        <div className="flex flex-col items-end gap-3">
          <div className="bg-surface-container-low p-5 rounded-xl text-right min-w-[200px]">
            <p className="text-xs text-on-surface-variant mb-1">Total do Período</p>
            <p className="text-3xl font-black font-headline text-primary">{formatBRL(total)}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={issueSalaries}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/40 rounded transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Lançar Salários
            </button>
            <button
              type="button"
              onClick={() => {
                window.focus()
                setModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Custo
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Asymmetric grid: form left, table right */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Table */}
        <div className="col-span-12 space-y-6">
          {/* Truck filter */}
          <div className="flex items-end gap-4">
            <div className="w-52">
              <Select
                label="Caminhão"
                value={filterTruckId}
                onChange={(v) => setFilterTruckId(v as string)}
                options={trucks.map((t) => ({
                  value: t.id,
                  label: (
                    <div className="flex justify-between">
                      <span>{t.license_plate}</span>
                      {t.customId && (
                        <span className="text-on-surface-variant/50">#{t.customId}</span>
                      )}
                    </div>
                  ),
                  displayLabel: t.license_plate,
                  searchableLabel: `${t.license_plate} ${t.customId || ''}`,
                }))}
                optional
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCategory('')}
              className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                !filterCategory
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright cursor-pointer'
              }`}
            >
              {!filterCategory && <span className="material-symbols-outlined text-sm">check</span>}
              Todos
            </button>
            {costCategories.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)}
                className={`px-4 py-2 rounded text-xs font-bold transition-colors ${
                  filterCategory === c.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright cursor-pointer'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Data', 'Descrição', 'Veículo', 'Categoria', 'Valor', ''].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo registrado
                    </td>
                  </tr>
                )}
                {filtered.map((row) => {
                  const cat = costCategories.find((c) => c.value === row.category)
                  return (
                    <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface text-sm">
                          {row.description || '—'}
                        </p>
                        {row.supplier_name && (
                          <p className="text-[10px] text-on-surface-variant">{row.supplier_name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                        {row.truck_license_plate ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${
                            categoryBadge[row.category] ??
                            'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {cat?.label ?? row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                        {formatBRL(row.value)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <Modal title="Novo Custo" onClose={() => setModal(false)} onEscape={handleEscape}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={categorySelectRef}
                    label="Categoria"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => dateRef.current?.focus()}
                    error={errors.category?.message}
                    options={costCategories}
                  />
                )}
              />
            </div>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  ref={dateRef}
                  label="Data"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.date?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      valueRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  ref={valueRef}
                  label="Valor"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.value?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      truckSelectRef.current?.open()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="truck_id"
              control={control}
              render={({ field }) => (
                <Select
                  ref={truckSelectRef}
                  label="Veículo"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => supplierSelectRef.current?.open()}
                  error={errors.truck_id?.message}
                  options={trucks.map((t) => ({
                    value: t.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{t.license_plate}</span>
                        {t.customId && (
                          <span className="text-on-surface-variant/50">#{t.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: t.license_plate,
                    searchableLabel: `${t.license_plate} ${t.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="supplier_id"
              control={control}
              render={({ field }) => (
                <Select
                  ref={supplierSelectRef}
                  label="Fornecedor"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => driverSelectRef.current?.open()}
                  error={errors.supplier_id?.message}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{s.name}</span>
                        {s.customId && (
                          <span className="text-on-surface-variant/50">#{s.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: s.name,
                    searchableLabel: `${s.name} ${s.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="driver_id"
              control={control}
              render={({ field }) => (
                <Select
                  ref={driverSelectRef}
                  label="Motorista"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => descRef.current?.focus()}
                  error={errors.driver_id?.message}
                  options={drivers.map((d) => ({
                    value: d.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{d.name}</span>
                        {d.customId && (
                          <span className="text-on-surface-variant/50">#{d.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: d.name,
                    searchableLabel: `${d.name} ${d.customId || ''}`,
                  }))}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={descRef}
                    label="Descrição"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.description?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit(onEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit as any)}>Salvar Custo</Button>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja lançar este custo?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este custo?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
