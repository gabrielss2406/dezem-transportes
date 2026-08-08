import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { tripSchema } from '../../../shared/schemas'
import { FieldSelectionModal } from '../components/FieldSelectionModal'
import { PageHeader } from '../components/PageHeader'
import {
  Badge,
  Button,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  Select,
  type SelectRef,
  Toast,
  useToast,
} from '../components/ui'
import { generatePdf } from '../lib/pdfGenerator'
import { TRIP_EXPORT_FIELDS, getDefaultTripExportFieldKeys } from '../lib/tripExportFields'
import type { Customer, Driver, Product, Trip, Truck } from '../lib/types'
import { formatBRL, formatDate, today } from '../lib/utils'

interface TripFormData {
  date: string
  truck_id: number
  driver_id: number
  product_id: number
  customer_id: number | null
  supplier_id: number | null
  weight_ton: number
  overweight_ton?: number | null
  overweight_observation?: string | null
  price_charged: number
  // No longer editable in the form (Total Trip Distance field was removed) — carried
  // through silently so existing trips keep their historical value on edit.
  km_driven: number
  observation?: string
  ticket_number: string
  has_percentage_tax?: boolean
  has_commission?: boolean
}

const EMPTY: TripFormData = {
  date: today(),
  truck_id: 0,
  driver_id: 0,
  product_id: 0,
  customer_id: null,
  supplier_id: null,
  weight_ton: 0,
  overweight_ton: null,
  overweight_observation: null,
  price_charged: 0,
  km_driven: 0,
  ticket_number: '',
  observation: '',
  has_percentage_tax: true,
  has_commission: true,
}

// Modal de confirmação próprio — sem confirm() nativo do Electron
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setTimeout(() => confirmBtnRef.current?.focus(), 50)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-6">
        <p className="text-sm text-on-surface">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button ref={confirmBtnRef} onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [hasOverweight, setHasOverweight] = useState(false)
  const [appSettings, setAppSettings] = useState({ taxRate: 0, commissionRate: 0 })
  const [pendingData, setPendingData] = useState<any>(null)
  const [showNewEntryPrompt, setShowNewEntryPrompt] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [exportFieldsConfig, setExportFieldsConfig] = useState<string[] | null>(null)
  const [showExportFieldsModal, setShowExportFieldsModal] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showTruckBreakdown, setShowTruckBreakdown] = useState(false)
  const [showDriverBreakdown, setShowDriverBreakdown] = useState(false)
  const [deductionView, setDeductionView] = useState<'tax' | 'commission'>('tax')
  const [noPriceRegistered, setNoPriceRegistered] = useState(false)
  const [manualUnitPrice, setManualUnitPrice] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    truck_id: '',
    driver_id: '',
    product_id: '',
    customer_id: '',
    ticket_number: '',
  })
  const { toast, show } = useToast()

  const location = useLocation()
  const navigate = useNavigate()

  // Refs para navegação por teclado
  const dateRef = useRef<HTMLInputElement>(null)
  const truckSelectRef = useRef<SelectRef>(null)
  const driverSelectRef = useRef<SelectRef>(null)
  const productSelectRef = useRef<SelectRef>(null)
  const customerSelectRef = useRef<SelectRef>(null)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const unitPriceInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const taxSelectRef = useRef<SelectRef>(null)
  const commissionSelectRef = useRef<SelectRef>(null)
  const ticketInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (location.state?.openModal) {
      setModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    watch,
    setValue,
    getValues,
    setError,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const selectedCustomerId = watch('customer_id')
  const selectedProductId = watch('product_id')
  const selectedDriverId = watch('driver_id')
  const currentWeight = watch('weight_ton')
  const currentOverweight = watch('overweight_ton')

  const selectedDriver = drivers.find((d) => d.id === Number(selectedDriverId))
  const hasCustomCommissionRate = selectedDriver?.commission_rate_override != null
  const effectiveCommissionRate =
    selectedDriver?.commission_rate_override ?? appSettings.commissionRate

  const priceLookupKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${selectedProductId}-${selectedCustomerId}`
    if (priceLookupKeyRef.current !== key) {
      priceLookupKeyRef.current = key
      setManualUnitPrice(null)
    }
    if (!selectedProductId) {
      setNoPriceRegistered(false)
      return
    }
    const weight = Number(currentWeight) || 0
    const overweight = Number(currentOverweight) || 0
    const readyToShowManualField = !!selectedCustomerId && weight > 0
    const applyUnitPrice = (unitPrice: number) => {
      setNoPriceRegistered(false)
      if (!editing) {
        setValue('price_charged', unitPrice * (weight + overweight))
      }
    }
    const fallbackToProductPrice = () => {
      const product = products.find((p) => p.id === Number(selectedProductId))
      if (product?.unit_value) {
        applyUnitPrice(product.unit_value)
        return
      }
      setNoPriceRegistered(readyToShowManualField)
      if (editing && readyToShowManualField && manualUnitPrice === null) {
        const existingPrice = Number(getValues('price_charged')) || 0
        if (existingPrice > 0) {
          setManualUnitPrice(existingPrice / (weight + overweight))
        }
      }
    }
    if (selectedCustomerId) {
      window.api.customerPrices
        .getPrice(Number(selectedCustomerId), Number(selectedProductId))
        .then((res) => {
          if (res?.price) {
            applyUnitPrice(res.price)
          } else {
            fallbackToProductPrice()
          }
        })
    } else {
      fallbackToProductPrice()
    }
  }, [
    selectedCustomerId,
    selectedProductId,
    currentWeight,
    currentOverweight,
    editing,
    setValue,
    products,
    manualUnitPrice,
    getValues,
  ])

  useEffect(() => {
    if (!noPriceRegistered || manualUnitPrice == null) {
      return
    }
    const weight = Number(currentWeight) || 0
    const overweight = Number(currentOverweight) || 0
    setValue('price_charged', manualUnitPrice * (weight + overweight))
  }, [manualUnitPrice, noPriceRegistered, currentWeight, currentOverweight, setValue])

  const load = useCallback(async () => {
    const [t, tr, d, p, c, settings, exportFields] = await Promise.all([
      window.api.trips.list(filters),
      window.api.trucks.list(),
      window.api.drivers.list(),
      window.api.products.list(),
      window.api.customers.list(),
      window.api.settings.getApp(),
      window.api.settings.getTripExportFields(),
    ])
    setTrips(t)
    setTrucks(tr)
    setDrivers(d)
    setProducts(p)
    setCustomers(c)
    setAppSettings(settings)
    setExportFieldsConfig(exportFields)
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  // Foco inicial e abertura automática
  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        if (!editing) {
          dateRef.current?.focus()
        } else {
          // Se estiver editando, foca no primeiro campo também
          dateRef.current?.focus()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY)
      setHasOverweight(false)
      setNoPriceRegistered(false)
      setManualUnitPrice(null)
    }
  }, [modal, editing, reset])

  const save = async (data: TripFormData) => {
    try {
      const wasEditing = !!editing
      let res: any
      if (editing) {
        res = await window.api.trips.update(editing.id, data as any)
      } else {
        res = await window.api.trips.create(data as any)
      }

      if (res && res.ok === false) {
        setPendingData(null)
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            setError(field as any, { type: 'manual', message: message as string })
          }
        } else {
          show('Ocorreu um erro ao salvar.', 'error')
        }
        return
      }

      show(wasEditing ? 'Lançamento atualizado!' : 'Lançamento registrado!')
      setModal(false)
      setPendingData(null)
      load()

      if (!wasEditing) {
        setShowNewEntryPrompt(true)
      }
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro ao salvar', 'error')
    }
  }

  const onSubmit = (data: TripFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: TripFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await window.api.trips.delete(deleteTarget.id)
    if (result?.ok === false) {
      setDeleteTarget(null)
      show(result.errors?.form || 'Não foi possível excluir o lançamento', 'error')
      return
    }
    show('Lançamento excluído', 'success')
    setDeleteTarget(null)
    load()
  }

  function edit(row: Trip) {
    reset({
      date: row.date,
      truck_id: row.truck_id,
      driver_id: row.driver_id,
      product_id: row.product_id,
      customer_id: row.customer_id ?? null,
      supplier_id: row.supplier_id ?? null,
      weight_ton: row.weight_ton,
      overweight_ton: row.overweight_ton ?? null,
      overweight_observation: row.overweight_observation ?? null,
      price_charged: row.price_charged,
      km_driven: row.km_driven,
      ticket_number: row.ticket_number ?? '',
      observation: row.observation ?? '',
      has_percentage_tax: !!row.has_percentage_tax,
      has_commission: !!row.has_commission,
    })
    setHasOverweight(!!(row.overweight_ton && row.overweight_ton > 0))
    setEditing(row)
    setModal(true)
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

  const totalRevenue = trips.reduce((s, t) => s + t.price_charged, 0)
  const totalTaxes = trips.reduce((s, t) => s + (t.tax_value || 0), 0)
  const totalNetRevenue = totalRevenue - totalTaxes
  const totalCommissions = trips.reduce((s, t) => s + (t.commission_value || 0), 0)
  const totalTon = trips.reduce((s, t) => s + t.weight_ton + (t.overweight_ton || 0), 0)

  const perTruck = Object.values(
    trips.reduce<Record<number, { license_plate: string; count: number }>>((acc, t) => {
      if (!acc[t.truck_id]) {
        acc[t.truck_id] = {
          license_plate: t.truck_license_plate ?? String(t.truck_id),
          count: 0,
        }
      }
      acc[t.truck_id].count++
      return acc
    }, {}),
  ).sort((a, b) => b.count - a.count)

  const perDriver = Object.values(
    trips.reduce<Record<number, { name: string; count: number }>>((acc, t) => {
      if (!acc[t.driver_id]) {
        acc[t.driver_id] = {
          name: t.driver_name ?? String(t.driver_id),
          count: 0,
        }
      }
      acc[t.driver_id].count++
      return acc
    }, {}),
  ).sort((a, b) => b.count - a.count)

  const buildExportFileMeta = () => {
    const filterParts: string[] = []
    const subtitleParts: string[] = []

    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? formatDate(filters.startDate) : 'Início'
      const end = filters.endDate ? formatDate(filters.endDate) : 'Fim'
      filterParts.push(`${start}_a_${end}`)
      subtitleParts.push(`Período: ${start} a ${end}`)
    }

    if (filters.truck_id) {
      const truck = trucks.find((t) => String(t.id) === String(filters.truck_id))
      if (truck) {
        filterParts.push(truck.license_plate)
        subtitleParts.push(`Caminhão: ${truck.license_plate}`)
      }
    }

    if (filters.driver_id) {
      const driver = drivers.find((d) => String(d.id) === String(filters.driver_id))
      if (driver) {
        filterParts.push(driver.name)
        subtitleParts.push(`Motorista: ${driver.name}`)
      }
    }

    if (filters.customer_id) {
      const customer = customers.find((c) => String(c.id) === String(filters.customer_id))
      if (customer) {
        filterParts.push(customer.name)
        subtitleParts.push(`Cliente: ${customer.name}`)
      }
    }

    if (filters.product_id) {
      const product = products.find((p) => String(p.id) === String(filters.product_id))
      if (product) {
        filterParts.push(product.name)
        subtitleParts.push(`Produto: ${product.name}`)
      }
    }

    const safeFilterName = filterParts
      .join('_')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '') // Remover acentos (Unicode Property Escape)
      .replace(/\s+/g, '_')
      .replace(/[^\w-]/g, '')

    const fileName = safeFilterName
      ? `relatorio_lancamentos_${safeFilterName}`
      : 'relatorio_lancamentos'
    const subtitle = subtitleParts.join(' | ')

    return { fileName, subtitle }
  }

  const handleGenerateExport = async (selectedKeys: string[], saveAsDefault: boolean) => {
    setShowExportFieldsModal(false)

    if (saveAsDefault) {
      setExportFieldsConfig(selectedKeys)
      window.api.settings.saveTripExportFields(selectedKeys).catch((error) => {
        console.error(error)
        show('Erro ao salvar a configuração padrão de exportação.', 'error')
      })
    }

    const fields = TRIP_EXPORT_FIELDS.filter((field) => selectedKeys.includes(field.key))
    const headers = fields.map((field) => field.label)
    const data = trips.map((trip) => fields.map((field) => field.getValue(trip)))
    const foot = [fields.map((field, i) => (i === 0 ? 'TOTAL' : (field.getTotal?.(trips) ?? '')))]

    const { fileName, subtitle } = buildExportFileMeta()

    const pdfData = generatePdf({
      title: 'Relatório de Lançamentos',
      subtitle,
      headers,
      data,
      foot,
      orientation: 'landscape',
    })

    try {
      const result = await window.api.exportPdf({
        fileName,
        data: pdfData,
      })

      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Operacional"
        title="Lançamentos"
        subtitle="Gerencie os manifestos de transporte e histórico de fretes."
        actionLabel="Novo Lançamento"
        onAction={() => {
          window.focus()
          setModal(true)
        }}
        secondaryActionLabel="Exportar para PDF"
        onSecondaryAction={() => setShowExportFieldsModal(true)}
      />

      {/* Filters */}
      <div className="bg-surface-container-low p-4 rounded-xl mb-10 border border-outline-variant/10 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <DatePicker
              label="Início"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <DatePicker
              label="Fim"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Caminhão"
              value={filters.truck_id}
              onChange={(v) => setFilters((f) => ({ ...f, truck_id: v }))}
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
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Motorista"
              value={filters.driver_id}
              onChange={(v) => setFilters((f) => ({ ...f, driver_id: v }))}
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
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Produto"
              value={filters.product_id}
              onChange={(v) => setFilters((f) => ({ ...f, product_id: v }))}
              options={products.map((p) => ({
                value: p.id,
                label: (
                  <div className="flex justify-between">
                    <span>{p.name}</span>
                    {p.customId && (
                      <span className="text-on-surface-variant/50">#{p.customId}</span>
                    )}
                  </div>
                ),
                displayLabel: p.name,
                searchableLabel: `${p.name} ${p.customId || ''}`,
              }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Cliente"
              value={filters.customer_id}
              onChange={(v) => setFilters((f) => ({ ...f, customer_id: v }))}
              options={customers.map((c) => ({
                value: c.id,
                label: (
                  <div className="flex justify-between">
                    <span>{c.name}</span>
                    {c.customId && (
                      <span className="text-on-surface-variant/50">#{c.customId}</span>
                    )}
                  </div>
                ),
                displayLabel: c.name,
                searchableLabel: `${c.name} ${c.customId || ''}`,
              }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Input
              label="Bilhete"
              placeholder="Nº do bilhete..."
              value={filters.ticket_number}
              onChange={(e) => setFilters((f) => ({ ...f, ticket_number: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        {[
          { label: 'Receita Bruta', value: formatBRL(totalRevenue), icon: 'payments' },
          { label: 'Receita Líquida', value: formatBRL(totalNetRevenue), icon: 'trending_up' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-surface-container-low p-6 rounded-xl flex items-center gap-4 border border-outline-variant/5 shadow-sm"
          >
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {label}
              </p>
              <p className="text-xl font-black text-on-surface font-headline">{value}</p>
            </div>
          </div>
        ))}

        {/* Impostos / Comissões — card combinado com alternância */}
        <div className="bg-surface-container-low p-6 rounded-xl flex items-center gap-4 border border-outline-variant/5 shadow-sm relative">
          <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary">
              {deductionView === 'tax' ? 'receipt' : 'percent'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {deductionView === 'tax' ? 'Total de Impostos' : 'Total de Comissões'}
            </p>
            <p className="text-xl font-black text-on-surface font-headline">
              {formatBRL(deductionView === 'tax' ? totalTaxes : totalCommissions)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeductionView((v) => (v === 'tax' ? 'commission' : 'tax'))}
            title="Alternar entre Impostos e Comissões"
            className="absolute top-2 right-2 p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-base">swap_horiz</span>
          </button>
        </div>

        {[{ label: 'Tonelagem Total', value: `${totalTon} ton`, icon: 'scale' }].map(
          ({ label, value, icon }) => (
            <div
              key={label}
              className="bg-surface-container-low p-6 rounded-xl flex items-center gap-4 border border-outline-variant/5 shadow-sm"
            >
              <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">{icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {label}
                </p>
                <p className="text-xl font-black text-on-surface font-headline">{value}</p>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Breakdown section */}
      <div className={showTruckBreakdown || showDriverBreakdown ? 'mb-10' : 'mb-4'}>
        <div className="flex items-center gap-6 mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Lançamentos: {trips.length}
          </h3>

          {/* Per-truck breakdown button */}
          {perTruck.length > 1 && (
            <button
              type="button"
              onClick={() => setShowTruckBreakdown((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {showTruckBreakdown ? 'expand_less' : 'expand_more'}
              </span>
              {showTruckBreakdown ? 'Ocultar por caminhão' : 'Ver por caminhão'}
            </button>
          )}

          {/* Per-driver breakdown button */}
          {perDriver.length > 1 && (
            <button
              type="button"
              onClick={() => setShowDriverBreakdown((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {showDriverBreakdown ? 'expand_less' : 'expand_more'}
              </span>
              {showDriverBreakdown ? 'Ocultar por motorista' : 'Ver por motorista'}
            </button>
          )}
        </div>

        {/* Per-truck breakdown content */}
        {showTruckBreakdown && perTruck.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {perTruck.map(({ license_plate, count }) => (
              <div
                key={license_plate}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/10 text-sm"
              >
                <span className="font-mono font-bold text-primary">{license_plate}</span>
                <span className="text-on-surface-variant text-xs">
                  {count} lançamento{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Per-driver breakdown content */}
        {showDriverBreakdown && perDriver.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {perDriver.map(({ name, count }) => (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/10 text-sm"
              >
                <span className="font-bold text-on-surface">{name}</span>
                <span className="text-on-surface-variant text-xs">
                  {count} lançamento{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {[
                'Data',
                'Bilhete',
                'Caminhão',
                'Motorista',
                'Produto',
                'Peso',
                'Valor',
                'Deduções',
                'Cliente',
                '',
              ].map((h) => (
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
            {trips.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum lançamento encontrado com os filtros selecionados
                </td>
              </tr>
            )}
            {trips.map((row, i) => {
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
                >
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                    {row.ticket_number || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono font-bold text-primary">
                    {row.truck_license_plate}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface">{row.driver_name}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{row.product_name}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {row.weight_ton} ton
                    {row.overweight_ton ? (
                      <div className="mt-1">
                        <Badge label={`+${row.overweight_ton} ton excesso`} color="amber" />
                      </div>
                    ) : null}
                    {row.fuel_stops_count
                      ? row.fuel_stops_count > 0 && (
                          <div className="mt-1">
                            <Badge label={`${row.fuel_stops_count} paradas`} color="amber" />
                          </div>
                        )
                      : null}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">
                    {formatBRL(row.price_charged)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">
                    {(() => {
                      const totalDeductions = (row.tax_value || 0) + (row.commission_value || 0)
                      return totalDeductions > 0 ? (
                        formatBRL(totalDeductions)
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {row.customer_name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => edit(row)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
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

      {/* Modal: Novo Lançamento */}
      {modal && (
        <Modal
          title={editing ? 'Editar Lançamento' : 'Novo Lançamento'}
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
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
                    label="Caminhão"
                    icon="local_shipping"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => driverSelectRef.current?.open()}
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
                name="driver_id"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={driverSelectRef}
                    label="Motorista"
                    icon="person"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => productSelectRef.current?.open()}
                    error={errors.driver_id?.message}
                    options={drivers.map((d) => ({
                      value: d.id,
                      label: (
                        <div className="flex justify-between">
                          <span>
                            {d.name}
                            {d.commission_rate_override != null && (
                              <span className="text-secondary text-xs ml-1">
                                (comissão {d.commission_rate_override}%)
                              </span>
                            )}
                          </span>
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

              <Controller
                name="product_id"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={productSelectRef}
                    label="Produto"
                    icon="inventory_2"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => customerSelectRef.current?.open()}
                    error={errors.product_id?.message}
                    options={products.map((p) => ({
                      value: p.id,
                      label: (
                        <div className="flex justify-between">
                          <span>{p.name}</span>
                          {p.customId && (
                            <span className="text-on-surface-variant/50">#{p.customId}</span>
                          )}
                        </div>
                      ),
                      displayLabel: p.name,
                      searchableLabel: `${p.name} ${p.customId || ''}`,
                    }))}
                  />
                )}
              />

              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={customerSelectRef}
                    label="Cliente"
                    optional
                    icon="business"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => weightInputRef.current?.focus()}
                    error={errors.customer_id?.message}
                    options={customers.map((c) => ({
                      value: c.id,
                      label: (
                        <div className="flex justify-between">
                          <span>{c.name}</span>
                          {c.customId && (
                            <span className="text-on-surface-variant/50">#{c.customId}</span>
                          )}
                        </div>
                      ),
                      displayLabel: c.name,
                      searchableLabel: `${c.name} ${c.customId || ''}`,
                    }))}
                  />
                )}
              />

              <Controller
                name="weight_ton"
                control={control}
                render={({ field }) => {
                  const selectedTruck = trucks.find((t) => t.id === watch('truck_id'))
                  const capacity = selectedTruck?.capacity_ton || 0
                  const totalWeight =
                    Number(field.value || 0) + Number(watch('overweight_ton') || 0)
                  const exceeds = capacity > 0 && totalWeight > capacity

                  return (
                    <div>
                      <Input
                        ref={weightInputRef}
                        label="Peso (ton)"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.weight_ton?.message}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const next = noPriceRegistered ? unitPriceInputRef : priceInputRef
                            next.current?.focus()
                          }
                        }}
                      />
                      {capacity > 0 && (
                        <p
                          className={`text-xs mt-1 ${exceeds ? 'text-amber-600 font-bold' : 'text-on-surface-variant'}`}
                        >
                          Capacidade: {capacity} ton | Total: {totalWeight.toFixed(2)} ton
                          {exceeds && ' ⚠️ Sobrecarga!'}
                        </p>
                      )}
                    </div>
                  )
                }}
              />

              {noPriceRegistered && (
                <div className="col-span-2 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-xs text-amber-700">
                    Nenhum preço cadastrado para esse produto/cliente. Informe o valor unitário para
                    calcular o valor cobrado automaticamente.
                  </p>
                  <CurrencyInput
                    ref={unitPriceInputRef}
                    label="Valor Unitário (R$/ton)"
                    value={manualUnitPrice ?? ''}
                    onChange={(v) => setManualUnitPrice(v === 0 ? null : v)}
                    onKeyDown={(e) => e.key === 'Enter' && priceInputRef.current?.focus()}
                  />
                </div>
              )}

              <Controller
                name="price_charged"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    ref={priceInputRef}
                    label="Valor cobrado"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.price_charged?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        ticketInputRef.current?.focus()
                      }
                    }}
                  />
                )}
              />

              <div className="col-span-2">
                <Controller
                  name="ticket_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      ref={ticketInputRef}
                      label="Nº do Bilhete"
                      placeholder="Ex: 000123"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.ticket_number?.message}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          taxSelectRef.current?.open()
                        }
                      }}
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <Input
                  label="Observação"
                  optional
                  {...register('observation')}
                  error={errors.observation?.message}
                />
              </div>

              {/* Tax section */}
              <Controller
                name="has_percentage_tax"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={taxSelectRef}
                    label="Imposto"
                    icon="receipt"
                    value={field.value ? 'true' : 'false'}
                    onChange={(v) => field.onChange(v === 'true')}
                    onEnterSelect={() => commissionSelectRef.current?.open()}
                    options={[
                      {
                        value: 'false',
                        label: 'Sem imposto',
                        displayLabel: 'Sem imposto',
                        searchableLabel: 'sem imposto',
                      },
                      {
                        value: 'true',
                        label: `Com imposto (${appSettings.taxRate}%)`,
                        displayLabel: `Com imposto (${appSettings.taxRate}%)`,
                        searchableLabel: `com imposto ${appSettings.taxRate}`,
                      },
                    ]}
                  />
                )}
              />

              {/* Commission section */}
              <div>
                <Controller
                  name="has_commission"
                  control={control}
                  render={({ field }) => (
                    <Select
                      ref={commissionSelectRef}
                      label="Comissão"
                      icon="percent"
                      value={field.value ? 'true' : 'false'}
                      onChange={(v) => field.onChange(v === 'true')}
                      onEnterSelect={() => handleSubmit(onEnterSubmit as any)()}
                      options={[
                        {
                          value: 'false',
                          label: 'Sem comissão',
                          displayLabel: 'Sem comissão',
                          searchableLabel: 'sem comissao',
                        },
                        {
                          value: 'true',
                          label: `Com comissão (${effectiveCommissionRate}%)`,
                          displayLabel: `Com comissão (${effectiveCommissionRate}%)`,
                          searchableLabel: `com comissao ${effectiveCommissionRate}`,
                        },
                      ]}
                    />
                  )}
                />
                {hasCustomCommissionRate && (
                  <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">star</span>
                    Comissão personalizada deste motorista
                  </p>
                )}
              </div>

              {/* Overweight toggle */}
              <div className="col-span-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hasOverweight
                    setHasOverweight(next)
                    if (!next) {
                      setValue('overweight_ton', null)
                      setValue('overweight_observation', null)
                    }
                  }}
                  className="flex items-center gap-3 group"
                >
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${hasOverweight ? 'bg-amber-500' : 'bg-surface-container-high'}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasOverweight ? 'translate-x-5' : ''}`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Carga com excesso de peso
                  </span>
                  {hasOverweight && <Badge label="EXCESSO" color="amber" />}
                </button>
              </div>

              {/* Overweight section */}
              {hasOverweight && (
                <div className="col-span-2 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Informações do Excesso de Peso
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="overweight_ton"
                      control={control}
                      render={({ field }) => (
                        <Input
                          label="Peso Excedente (ton)"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          error={errors.overweight_ton?.message}
                        />
                      )}
                    />
                    <Input
                      label="Autorização / Observação"
                      optional
                      placeholder="Nº autorização, motivo..."
                      {...register('overweight_observation')}
                      error={errors.overweight_observation?.message}
                    />
                  </div>
                  {currentWeight && currentOverweight ? (
                    <div className="flex items-center justify-between bg-amber-500/10 px-4 py-2 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                        Peso Total
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        {Number(currentWeight) + Number(currentOverweight)} ton
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit as any)}
                className="flex items-center gap-3 px-8 py-3 bg-primary text-on-primary font-extrabold rounded transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20"
              >
                {editing ? 'Salvar Alterações' : 'Salvar Lançamento'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este lançamento?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {showNewEntryPrompt && (
        <ConfirmModal
          message="Lançamento registrado! Deseja iniciar um novo lançamento agora?"
          onConfirm={() => {
            setShowNewEntryPrompt(false)
            setModal(true)
          }}
          onCancel={() => setShowNewEntryPrompt(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este lançamento?"
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

      {showExportFieldsModal && (
        <FieldSelectionModal
          title="Exportar para PDF"
          fields={TRIP_EXPORT_FIELDS.map((field) => ({ key: field.key, label: field.label }))}
          initialSelected={exportFieldsConfig ?? getDefaultTripExportFieldKeys(filters)}
          onCancel={() => setShowExportFieldsModal(false)}
          onConfirm={handleGenerateExport}
        />
      )}
    </div>
  )
}
