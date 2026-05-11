import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { costSchema } from '../../../shared/schemas'
import {
  Button,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  Select,
  Toast,
  useToast,
} from '../components/ui'
import type { Cost, Driver, Supplier, Truck } from '../lib/types'
import { COST_CATEGORIES, currentMonthKey, formatBRL, formatDate } from '../lib/utils'

const EMPTY = {
  date: '',
  category: '',
  value: '',
  truck_id: '',
  supplier_id: '',
  driver_id: '',
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
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [modal, setModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    control,
  } = useForm<Omit<Cost, 'id'>>({
    resolver: zodResolver(costSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(async () => {
    const [c, tr, s, d] = await Promise.all([
      window.api.costs.list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list(),
    ])
    setCosts(c)
    setTrucks(tr)
    setSuppliers(s)
    setDrivers(d)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      reset(EMPTY)
    }
  }, [modal])

  const onSubmit = async (data: Omit<Cost, 'id'>) => {
    try {
      await window.api.costs.create(data)
      show('Custo lançado!')
      setModal(false)
      reset(EMPTY)
      load()
    } catch (e: any) {
      show(e.message || 'Erro', 'error')
    }
  }

  async function handleDelete(row: Cost) {
    if (!confirm('Excluir este custo?')) return
    await window.api.costs.delete(row.id)
    show('Custo excluído')
    load()
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
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão Financeira
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Custos da Frota
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-xl text-base">
            Gerencie as despesas operacionais com precisão.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-surface-container-low p-5 rounded-xl text-right min-w-[200px]">
            <p className="text-xs text-on-surface-variant mb-1">Total do Período</p>
            <p className="text-3xl font-black font-headline text-primary">{formatBRL(total)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={issueSalaries}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/40 rounded transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Lançar Salários
            </button>
            <button
              onClick={() => {
                reset(EMPTY)
                setModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Custo
            </button>
          </div>
        </div>
      </div>

      {/* Asymmetric grid: form left, table right */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Quick-add form */}
        <div className="col-span-4 bg-surface-container-low p-8 rounded-xl border-l-4 border-primary relative">
          <h4 className="text-base font-headline font-bold mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">add_circle</span>
            Lançar Custo
          </h4>
          <div className="space-y-4">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  label="Categoria"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.category?.message}
                  options={COST_CATEGORIES}
                />
              )}
            />
            <DatePicker label="Data" {...register('date')} error={errors.date?.message} />
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Valor"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.value?.message}
                />
              )}
            />
            <Controller
              name="truck_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Veículo"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.truck_id?.message}
                  options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
                />
              )}
            />
            <Controller
              name="supplier_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Fornecedor"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.supplier_id?.message}
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
              )}
            />
            <Controller
              name="driver_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Motorista"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.driver_id?.message}
                  options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                />
              )}
            />
            <Input
              label="Descrição"
              optional
              {...register('description')}
              error={errors.description?.message}
              rows={2}
              placeholder="Detalhes da despesa..."
            />
            <button
              onClick={handleSubmit(onSubmit)}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg shadow-xl shadow-primary/10 hover:brightness-110 active:scale-95 transition-all text-sm"
            >
              Confirmar Lançamento
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="col-span-8 space-y-6">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
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
            {COST_CATEGORIES.map((c) => (
              <button
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
                      colSpan={6}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo registrado
                    </td>
                  </tr>
                )}
                {filtered.map((row) => {
                  const cat = COST_CATEGORIES.find((c) => c.value === row.category)
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
                            onClick={() => handleDelete(row)}
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
        <Modal title="Novo Custo" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Categoria"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.category?.message}
                    options={COST_CATEGORIES}
                  />
                )}
              />
            </div>
            <DatePicker label="Data" {...register('date')} error={errors.date?.message} />
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Valor"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.value?.message}
                />
              )}
            />
            <Controller
              name="truck_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Veículo"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.truck_id?.message}
                  options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
                />
              )}
            />
            <Controller
              name="supplier_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Fornecedor"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.supplier_id?.message}
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
              )}
            />
            <Controller
              name="driver_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Motorista"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.driver_id?.message}
                  options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                />
              )}
            />
            <div className="col-span-2">
              <Input
                label="Descrição"
                optional
                {...register('description')}
                error={errors.description?.message}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>Salvar Custo</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
