import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { tripSchema } from '../../../shared/schemas'
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
import type { Customer, Driver, Product, Supplier, Trip, Truck } from '../lib/types'
import { formatBRL, formatDate } from '../lib/utils'

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
  km_driven: number
  observation?: string
  fuel_stops?: any[]
}

const EMPTY: TripFormData = {
  date: '',
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
  observation: '',
  fuel_stops: [],
}

const typeIcon: Record<string, string> = {
  gas_station: 'local_gas_station',
  workshop: 'build',
  quarry: 'foundation',
  other: 'handshake',
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [hasOverweight, setHasOverweight] = useState(false)
  const [stopSearchId, setStopSearchId] = useState<string | number>('')
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    truck_id: '',
    driver_id: '',
    product_id: '',
    customer_id: '',
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
  const priceInputRef = useRef<HTMLInputElement>(null)
  const kmInputRef = useRef<HTMLInputElement>(null)

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
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fuel_stops' as any,
  })

  const selectedCustomerId = watch('customer_id')
  const selectedProductId = watch('product_id')
  const currentWeight = watch('weight_ton')
  const currentOverweight = watch('overweight_ton')

  useEffect(() => {
    if (selectedCustomerId && selectedProductId && !editing) {
      window.api.customerPrices
        .getPrice(Number(selectedCustomerId), Number(selectedProductId))
        .then((res) => {
          if (res?.price) {
            const weight = Number(currentWeight) || 0
            const overweight = Number(currentOverweight) || 0
            setValue('price_charged', res.price * (weight + overweight))
          }
        })
    }
  }, [selectedCustomerId, selectedProductId, currentWeight, currentOverweight, editing, setValue])

  const load = useCallback(async () => {
    const [t, tr, d, p, c, s] = await Promise.all([
      window.api.trips.list(filters),
      window.api.trucks.list(),
      window.api.drivers.list(),
      window.api.products.list(),
      window.api.customers.list(),
      window.api.suppliers.list(),
    ])
    setTrips(t)
    setTrucks(tr)
    setDrivers(d)
    setProducts(p)
    setCustomers(c)
    setSuppliers(s)
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
      setStopSearchId('')
      setHasOverweight(false)
    }
  }, [modal, editing, reset])

  const save = async (data: TripFormData) => {
    try {
      if (editing) {
        await window.api.trips.update(editing.id, data as any)
        show('Lançamento atualizado!')
      } else {
        await window.api.trips.create(data as any)
        show('Lançamento registrado!')
      }
      setModal(false)
      setPendingData(null)
      load()
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
    await window.api.trips.delete(deleteTarget.id)
    show('Lançamento excluído', 'success')
    setDeleteTarget(null)
    load()
  }

  async function edit(row: Trip) {
    try {
      const fuelStops = await window.api.trips.getFuelStops(row.id)
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
        observation: row.observation ?? '',
        fuel_stops: fuelStops,
      })
      setHasOverweight(!!(row.overweight_ton && row.overweight_ton > 0))
      setEditing(row)
      setModal(true)
    } catch (e: any) {
      show(e.message || 'Erro ao carregar lançamento', 'error')
    }
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

  const handleAddStop = (supplierId: string | number) => {
    if (!supplierId) {
      return
    }
    const supplier = suppliers.find((s) => String(s.id) === String(supplierId))
    if (supplier) {
      append({ supplier_id: supplier.id, value: 0, liters: null, km_driven: 0 })
      setStopSearchId('') // Reset selection
    }
  }

  const totalRevenue = trips.reduce((s, t) => s + t.price_charged, 0)
  const totalKm = trips.reduce((s, t) => s + t.km_driven, 0)
  const totalTon = trips.reduce((s, t) => s + t.weight_ton + (t.overweight_ton || 0), 0)

  return (
    <div className="p-12 max-w-7xl mx-auto">
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
        onSecondaryAction={async () => {
          const headers = [
            'Data',
            'Caminhão',
            'Motorista',
            'Produto',
            'Peso',
            'Km',
            'Valor',
            'Cliente',
          ]
          const data = trips.map((trip) => [
            formatDate(trip.date),
            trip.truck_license_plate ?? '—',
            trip.driver_name ?? '—',
            trip.product_name ?? '—',
            trip.overweight_ton
              ? `${trip.weight_ton} + ${trip.overweight_ton} ton (excesso)`
              : `${trip.weight_ton} ton`,
            `${trip.km_driven} km`,
            formatBRL(trip.price_charged),
            trip.customer_name ?? '—',
          ])

          // Resolver nomes dos filtros
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

          const pdfData = generatePdf({
            title: 'Relatório de Lançamentos',
            subtitle,
            headers,
            data,
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
        }}
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
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Receita Total', value: formatBRL(totalRevenue), icon: 'payments' },
          { label: 'Km Total', value: `${totalKm.toFixed(0)} km`, icon: 'route' },
          { label: 'Tonelagem Total', value: `${totalTon} ton`, icon: 'scale' },
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
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {[
                'Data',
                'Caminhão',
                'Motorista',
                'Produto',
                'Peso',
                'Km',
                'Valor',
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
                <td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum lançamento encontrado com os filtros selecionados
                </td>
              </tr>
            )}
            {trips.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
              >
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {formatDate(row.date)}
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
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {row.km_driven} km
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
            ))}
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
                render={({ field }) => (
                  <Input
                    ref={weightInputRef}
                    label="Peso (ton)"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.weight_ton?.message}
                    onKeyDown={(e) => e.key === 'Enter' && priceInputRef.current?.focus()}
                  />
                )}
              />

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
                    onKeyDown={(e) => e.key === 'Enter' && kmInputRef.current?.focus()}
                  />
                )}
              />

              <Controller
                name="km_driven"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={kmInputRef}
                    label="Km total da viagem"
                    type="number"
                    placeholder="0"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.km_driven?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit(onEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />

              <div className="col-span-2">
                <Input
                  label="Observação"
                  optional
                  {...register('observation')}
                  error={errors.observation?.message}
                />
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

            {/* Paradas e Custos */}
            <div className="border-t border-outline-variant/10 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">
                Paradas e Custos Extra (Postos, Oficinas, etc.)
              </h3>

              <div className="mb-6">
                <Select
                  placeholder="Pesquisar local/fornecedor para adicionar..."
                  value={stopSearchId}
                  onChange={handleAddStop}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm opacity-60">
                            {typeIcon[s.type] || 'handshake'}
                          </span>
                          <span>{s.name}</span>
                        </div>
                        <Badge label={s.type} color={s.type === 'gas_station' ? 'amber' : 'gray'} />
                      </div>
                    ),
                    displayLabel: s.name,
                    searchableLabel: `${s.name} ${s.customId || ''}`,
                  }))}
                />
              </div>

              <div className="space-y-4">
                {fields.map((field: any, index) => {
                  const supplier = suppliers.find((s) => s.id === field.supplier_id)
                  return (
                    <div
                      key={field.id}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-primary">
                            {supplier ? typeIcon[supplier.type] : 'location_on'}
                          </span>
                          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                            {supplier?.name || 'Local'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          title="Remover parada"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>

                      <div className="p-4 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div
                          className={supplier?.type === 'gas_station' ? 'col-span-1' : 'col-span-3'}
                        >
                          <Controller
                            name={`fuel_stops.${index}.value` as any}
                            control={control}
                            render={({ field }) => (
                              <CurrencyInput
                                label="Valor Gasto"
                                value={field.value}
                                onChange={field.onChange}
                                error={(errors.fuel_stops as any)?.[index]?.value?.message}
                              />
                            )}
                          />
                        </div>
                        {supplier?.type === 'gas_station' && (
                          <>
                            <div className="col-span-1">
                              <Input
                                label="Litros"
                                optional
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...register(`fuel_stops.${index}.liters` as any)}
                                error={(errors.fuel_stops as any)?.[index]?.liters?.message}
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                label="Andou (km)"
                                optional
                                type="number"
                                placeholder="0"
                                {...register(`fuel_stops.${index}.km_driven` as any)}
                                error={(errors.fuel_stops as any)?.[index]?.km_driven?.message}
                              />
                            </div>
                            <div className="col-span-3 flex items-center justify-between bg-tertiary-container/10 px-4 py-2 rounded-lg">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Rendimento Estimado
                              </span>
                              <Badge
                                color="green"
                                label={`${(() => {
                                  const liters = watch(`fuel_stops.${index}.liters` as any)
                                  const km = watch(`fuel_stops.${index}.km_driven` as any)
                                  if (!liters || !km || Number(liters) === 0) {
                                    return '0.00'
                                  }
                                  return (Number(km) / Number(liters)).toFixed(2)
                                })()} km/L`}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}

                {fields.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-outline-variant/10 rounded-xl text-on-surface-variant text-sm italic">
                    Utilize a busca acima para registrar paradas (abastecimentos, gastos, etc.)
                  </div>
                )}
              </div>
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
    </div>
  )
}
