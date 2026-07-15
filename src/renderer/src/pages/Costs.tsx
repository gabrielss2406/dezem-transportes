import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { costSchema, fuelRecordSchema } from '../../../shared/schemas'
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
import type { Cost, Driver, FuelRecord, Supplier, Truck } from '../lib/types'
import { currentMonthKey, formatBRL, formatDate, today } from '../lib/utils'

interface CostFormData {
  date: string
  category: string
  value: number
  truck_id: number | null
  supplier_id: number | null
  driver_id: number | null
  description?: string
}

interface FuelFormData {
  truck_id: number
  date: string
  liters: number | null
  value: number
  odometer_at_service: number
  supplier_id: number | null
  notes?: string
}

const EMPTY_COST: CostFormData = {
  date: today(),
  category: '',
  value: 0,
  truck_id: null,
  supplier_id: null,
  driver_id: null,
  description: '',
}

const EMPTY_FUEL: FuelFormData = {
  truck_id: 0,
  date: today(),
  liters: null,
  value: 0,
  odometer_at_service: 0,
  supplier_id: null,
  notes: '',
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
  const [activeTab, setActiveTab] = useState<'costs' | 'fuel'>('costs')

  // ── Costs state ──
  const [costs, setCosts] = useState<Cost[]>([])
  const [costCategories, setCostCategories] = useState<{ value: string; label: string }[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [costDateFilters, setCostDateFilters] = useState({ startDate: '', endDate: '' })
  const [costModal, setCostModal] = useState(false)
  const [pendingCost, setPendingCost] = useState<any>(null)
  const [deleteCostTarget, setDeleteCostTarget] = useState<Cost | null>(null)
  const [showCostDiscardConfirm, setShowCostDiscardConfirm] = useState(false)

  // ── Fuel state ──
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [fuelFilters, setFuelFilters] = useState({ truck_id: '', startDate: '', endDate: '' })
  const [fuelModal, setFuelModal] = useState(false)
  const [pendingFuel, setPendingFuel] = useState<any>(null)
  const [deleteFuelTarget, setDeleteFuelTarget] = useState<FuelRecord | null>(null)
  const [showFuelDiscardConfirm, setShowFuelDiscardConfirm] = useState(false)

  // ── Shared state ──
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const { toast, show } = useToast()

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.openModal) {
      setCostModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // ── Cost form ──
  const categorySelectRef = useRef<SelectRef>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const truckSelectRef = useRef<SelectRef>(null)
  const supplierSelectRef = useRef<SelectRef>(null)
  const driverSelectRef = useRef<SelectRef>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit: handleCostSubmit,
    formState: { errors: costErrors, isDirty: isCostDirty },
    reset: resetCost,
    control: costControl,
  } = useForm<CostFormData>({
    resolver: zodResolver(costSchema) as any,
    defaultValues: { ...EMPTY_COST },
    mode: 'all',
  })

  // ── Fuel form ──
  const fuelTruckSelectRef = useRef<SelectRef>(null)
  const fuelDateRef = useRef<HTMLInputElement>(null)
  const fuelOdometerRef = useRef<HTMLInputElement>(null)
  const fuelLitersRef = useRef<HTMLInputElement>(null)
  const fuelValueRef = useRef<HTMLInputElement>(null)
  const fuelSupplierSelectRef = useRef<SelectRef>(null)
  const fuelNotesRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit: handleFuelSubmit,
    formState: { errors: fuelErrors, isDirty: isFuelDirty },
    reset: resetFuel,
    control: fuelControl,
    watch: watchFuel,
    setError: setFuelError,
  } = useForm<FuelFormData>({
    resolver: zodResolver(fuelRecordSchema) as any,
    defaultValues: { ...EMPTY_FUEL },
    mode: 'all',
  })

  const selectedFuelTruckId = watchFuel('truck_id')
  const selectedTruck = trucks.find((t) => String(t.id) === String(selectedFuelTruckId))

  const gasStations = suppliers.filter((s) => s.type === 'gas_station')

  const load = useCallback(async () => {
    const [cc, tr, s, d] = await Promise.all([
      window.api['cost-categories'].list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list(),
    ])
    setCostCategories(cc)
    setTrucks(tr)
    setSuppliers(s)
    setDrivers(d)
  }, [])

  const loadCosts = useCallback(async () => {
    const c = await window.api.costs.list({
      startDate: costDateFilters.startDate || undefined,
      endDate: costDateFilters.endDate || undefined,
    })
    setCosts(c)
  }, [costDateFilters])

  const loadFuel = useCallback(async () => {
    const f = await window.api.fuel.list(
      fuelFilters.truck_id || fuelFilters.startDate || fuelFilters.endDate
        ? {
            truck_id: fuelFilters.truck_id || undefined,
            startDate: fuelFilters.startDate || undefined,
            endDate: fuelFilters.endDate || undefined,
          }
        : {},
    )
    setFuelRecords(f)
  }, [fuelFilters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadCosts()
  }, [loadCosts])

  useEffect(() => {
    loadFuel()
  }, [loadFuel])

  // ── Cost modal lifecycle ──
  useEffect(() => {
    if (costModal) {
      setTimeout(() => {
        window.focus()
        categorySelectRef.current?.open()
      }, 200)
    } else {
      resetCost(EMPTY_COST)
    }
  }, [costModal, resetCost])

  // ── Fuel modal lifecycle ──
  useEffect(() => {
    if (fuelModal) {
      setTimeout(() => {
        window.focus()
        fuelTruckSelectRef.current?.open()
      }, 200)
    } else {
      resetFuel(EMPTY_FUEL)
    }
  }, [fuelModal, resetFuel])

  // ── Cost handlers ──
  const saveCost = async (data: CostFormData) => {
    try {
      await window.api.costs.create(data as any)
      show('Custo lançado!')
      setCostModal(false)
      setPendingCost(null)
      loadCosts()
    } catch (e: any) {
      setPendingCost(null)
      show(e.message || 'Erro ao lançar custo', 'error')
    }
  }

  const onCostSubmit = (data: CostFormData) => saveCost(data)
  const onCostEnterSubmit = (data: CostFormData) => setPendingCost(data)

  const handleDeleteCost = async () => {
    if (!deleteCostTarget) {
      return
    }
    await window.api.costs.delete(deleteCostTarget.id)
    show('Custo excluído')
    setDeleteCostTarget(null)
    loadCosts()
  }

  const handleCostEscape = () => {
    if (isCostDirty) {
      setShowCostDiscardConfirm(true)
    } else {
      setCostModal(false)
    }
  }

  // ── Fuel handlers ──
  const saveFuel = async (data: FuelFormData) => {
    try {
      const result = await window.api.fuel.create(data as any)
      if (result?.ok === false) {
        setPendingFuel(null)
        if (result.errors?.odometer_at_service) {
          setFuelError('odometer_at_service', { message: result.errors.odometer_at_service })
          setFuelModal(true)
        } else {
          show(result.errors?.form || 'Erro ao registrar abastecimento', 'error')
        }
        return
      }
      show('Abastecimento registrado!')
      setFuelModal(false)
      setPendingFuel(null)
      loadFuel()
      load()
    } catch (e: any) {
      setPendingFuel(null)
      show(e.message || 'Erro ao registrar abastecimento', 'error')
    }
  }

  const onFuelSubmit = (data: FuelFormData) => saveFuel(data)
  const onFuelEnterSubmit = (data: FuelFormData) => setPendingFuel(data)

  const handleDeleteFuel = async () => {
    if (!deleteFuelTarget) {
      return
    }
    await window.api.fuel.delete(deleteFuelTarget.id)
    show('Abastecimento excluído')
    setDeleteFuelTarget(null)
    loadFuel()
    load()
  }

  const handleFuelEscape = () => {
    if (isFuelDirty) {
      setShowFuelDiscardConfirm(true)
    } else {
      setFuelModal(false)
    }
  }

  async function issueSalaries() {
    const month = currentMonthKey()
    const r = await window.api.costs.issueMonthlySalaries(month)
    show(r.issued > 0 ? `${r.issued} salário(s) lançado(s)!` : 'Salários já lançados neste mês')
    loadCosts()
  }

  const filteredCosts = filterCategory ? costs.filter((c) => c.category === filterCategory) : costs
  const totalCosts = filteredCosts.reduce((s, c) => s + c.value, 0)
  const totalFuel = fuelRecords.reduce((s, f) => s + f.value, 0)

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão Financeira"
        title="Custos da Frota"
        subtitle="Gerencie despesas operacionais e histórico de abastecimentos."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-outline-variant/20">
        <button
          type="button"
          onClick={() => setActiveTab('costs')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'costs'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          Custos Operacionais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fuel')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'fuel'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">local_gas_station</span>
          Abastecimentos
        </button>
      </div>

      {/* ── COSTS TAB ── */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="bg-surface-container-low px-5 py-3 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-0.5">Total do Período</p>
              <p className="text-2xl font-black font-headline text-primary">
                {formatBRL(totalCosts)}
              </p>
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
                  setCostModal(true)
                }}
                className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Novo Custo
              </button>
            </div>
          </div>

          {/* Date filters */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="De"
                value={costDateFilters.startDate}
                onChange={(e) => setCostDateFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="Até"
                value={costDateFilters.endDate}
                onChange={(e) => setCostDateFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

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
                {filteredCosts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo registrado
                    </td>
                  </tr>
                )}
                {filteredCosts.map((row) => {
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
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${categoryBadge[row.category] ?? 'bg-surface-container-highest text-on-surface-variant'}`}
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
                            onClick={() => setDeleteCostTarget(row)}
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
      )}

      {/* ── FUEL TAB ── */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="bg-surface-container-low px-5 py-3 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-0.5">Total em Combustível</p>
              <p className="text-2xl font-black font-headline text-primary">
                {formatBRL(totalFuel)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.focus()
                setFuelModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Abastecimento
            </button>
          </div>

          {/* Filters */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <Select
                label="Caminhão"
                value={fuelFilters.truck_id}
                onChange={(v) => setFuelFilters((f) => ({ ...f, truck_id: String(v) }))}
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
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="De"
                value={fuelFilters.startDate}
                onChange={(e) => setFuelFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="Até"
                value={fuelFilters.endDate}
                onChange={(e) => setFuelFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Data', 'Caminhão', 'Posto', 'Litros', 'Hodômetro', 'Valor', ''].map((h) => (
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
                {fuelRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum abastecimento registrado
                    </td>
                  </tr>
                )}
                {fuelRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-primary text-sm">
                        {row.truck_license_plate}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">{row.truck_model}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {row.supplier_name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {row.liters != null ? `${Number(row.liters).toFixed(2)} L` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface">
                      {Number(row.odometer_at_service).toFixed(0)} km
                    </td>
                    <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                      {formatBRL(row.value)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setDeleteFuelTarget(row)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COST MODAL ── */}
      {costModal && (
        <Modal title="Novo Custo" onClose={() => setCostModal(false)} onEscape={handleCostEscape}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="category"
                control={costControl}
                render={({ field }) => (
                  <Select
                    ref={categorySelectRef}
                    label="Categoria"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => dateRef.current?.focus()}
                    error={costErrors.category?.message}
                    options={costCategories}
                  />
                )}
              />
            </div>
            <Controller
              name="date"
              control={costControl}
              render={({ field }) => (
                <DatePicker
                  ref={dateRef}
                  label="Data"
                  value={field.value}
                  onChange={field.onChange}
                  error={costErrors.date?.message}
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
              control={costControl}
              render={({ field }) => (
                <CurrencyInput
                  ref={valueRef}
                  label="Valor"
                  value={field.value}
                  onChange={field.onChange}
                  error={costErrors.value?.message}
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
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={truckSelectRef}
                  label="Veículo"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => supplierSelectRef.current?.open()}
                  error={costErrors.truck_id?.message}
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
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={supplierSelectRef}
                  label="Fornecedor"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => driverSelectRef.current?.open()}
                  error={costErrors.supplier_id?.message}
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
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={driverSelectRef}
                  label="Motorista"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => descRef.current?.focus()}
                  error={costErrors.driver_id?.message}
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
                control={costControl}
                render={({ field }) => (
                  <Input
                    ref={descRef}
                    label="Descrição"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={costErrors.description?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCostSubmit(onCostEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setCostModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCostSubmit(onCostSubmit as any)}>Salvar Custo</Button>
          </div>
        </Modal>
      )}

      {/* ── FUEL MODAL ── */}
      {fuelModal && (
        <Modal
          title="Novo Abastecimento"
          onClose={() => setFuelModal(false)}
          onEscape={handleFuelEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="truck_id"
                control={fuelControl}
                render={({ field }) => (
                  <Select
                    ref={fuelTruckSelectRef}
                    label="Caminhão"
                    icon="local_shipping"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => fuelDateRef.current?.focus()}
                    error={fuelErrors.truck_id?.message}
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
            </div>
            <Controller
              name="date"
              control={fuelControl}
              render={({ field }) => (
                <DatePicker
                  ref={fuelDateRef}
                  label="Data"
                  value={field.value}
                  onChange={field.onChange}
                  error={fuelErrors.date?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelOdometerRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="odometer_at_service"
              control={fuelControl}
              render={({ field }) => (
                <div>
                  <Input
                    ref={fuelOdometerRef}
                    label="Hodômetro Atual (km)"
                    type="number"
                    placeholder="0"
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={fuelErrors.odometer_at_service?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        fuelLitersRef.current?.focus()
                      }
                    }}
                  />
                  {selectedTruck && (
                    <p className="text-[11px] text-on-surface-variant/60 mt-1 ml-1">
                      Hodômetro registrado: {Number(selectedTruck.current_odometer).toFixed(0)} km
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="liters"
              control={fuelControl}
              render={({ field }) => (
                <Input
                  ref={fuelLitersRef}
                  label="Litros"
                  optional
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={fuelErrors.liters?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelValueRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="value"
              control={fuelControl}
              render={({ field }) => (
                <CurrencyInput
                  ref={fuelValueRef}
                  label="Valor Total"
                  value={field.value}
                  onChange={field.onChange}
                  error={fuelErrors.value?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelSupplierSelectRef.current?.open()
                    }
                  }}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="supplier_id"
                control={fuelControl}
                render={({ field }) => (
                  <Select
                    ref={fuelSupplierSelectRef}
                    label="Posto de Combustível"
                    optional
                    icon="local_gas_station"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => fuelNotesRef.current?.focus()}
                    error={fuelErrors.supplier_id?.message}
                    options={gasStations.map((s) => ({
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
            </div>
            <div className="col-span-2">
              <Controller
                name="notes"
                control={fuelControl}
                render={({ field }) => (
                  <Input
                    ref={fuelNotesRef}
                    label="Observações"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={fuelErrors.notes?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleFuelSubmit(onFuelEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setFuelModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFuelSubmit(onFuelSubmit as any)}>Registrar Abastecimento</Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM MODALS ── */}
      {pendingCost && (
        <ConfirmModal
          message="Tem certeza que deseja lançar este custo?"
          onConfirm={() => saveCost(pendingCost)}
          onCancel={() => setPendingCost(null)}
        />
      )}
      {deleteCostTarget && (
        <ConfirmModal
          message="Excluir este custo?"
          onConfirm={handleDeleteCost}
          onCancel={() => setDeleteCostTarget(null)}
        />
      )}
      {showCostDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowCostDiscardConfirm(false)
            setCostModal(false)
          }}
          onCancel={() => setShowCostDiscardConfirm(false)}
        />
      )}
      {pendingFuel && (
        <ConfirmModal
          message="Confirmar o registro deste abastecimento?"
          onConfirm={() => saveFuel(pendingFuel)}
          onCancel={() => setPendingFuel(null)}
        />
      )}
      {deleteFuelTarget && (
        <ConfirmModal
          message="Excluir este registro de abastecimento? O hodômetro do caminhão será recalculado."
          onConfirm={handleDeleteFuel}
          onCancel={() => setDeleteFuelTarget(null)}
        />
      )}
      {showFuelDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowFuelDiscardConfirm(false)
            setFuelModal(false)
          }}
          onCancel={() => setShowFuelDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
