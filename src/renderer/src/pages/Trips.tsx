import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { tripSchema } from '../../../shared/schemas'
import type { Customer, Driver, Product, Route, Supplier, Trip, Truck } from '../../lib/types'
import { PageHeader } from '../components/PageHeader'
import {
  Badge,
  Button,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  Select,
  Toast,
  useToast,
} from '../components/ui'
import { formatBRL, formatDate } from '../lib/utils'

const EMPTY = {
  date: '',
  truck_id: '',
  driver_id: '',
  product_id: '',
  customer_id: '',
  route_id: '',
  supplier_id: '',
  weight_ton: '' as any,
  price_charged: 0,
  km_driven: '' as any,
  observation: '',
  fuel_stops: [],
}

const typeIcon: Record<string, string> = {
  gas_station: 'local_gas_station',
  workshop: 'build',
  quarry: 'foundation',
  other: 'handshake',
}

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [stopSearchId, setStopSearchId] = useState<string | number>('')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    truck_id: '',
    driver_id: '',
    product_id: '',
    customer_id: '',
    route_id: '',
  })
  const { toast, show } = useToast()

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.openModal) {
      setModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<Omit<Trip, 'id'>>({
    resolver: zodResolver(tripSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fuel_stops' as any,
  })

  const selectedCustomerId = watch('customer_id')

  const load = useCallback(async () => {
    const [t, tr, d, p, c, r, s] = await Promise.all([
      window.api.trips.list(filters),
      window.api.trucks.list(),
      window.api.drivers.list(),
      window.api.products.list(),
      window.api.customers.list(),
      window.api.routes.list(),
      window.api.suppliers.list(),
    ])
    setTrips(t)
    setTrucks(tr)
    setDrivers(d)
    setProducts(p)
    setCustomers(c)
    setRoutes(r)
    setSuppliers(s)
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      setEditing(null)
      reset(EMPTY)
      setStopSearchId('')
    }
  }, [modal, reset])

  const onSubmit = async (data: Omit<Trip, 'id'>) => {
    try {
      if (editing) {
        await window.api.trips.update(editing.id, data)
        show('Viagem atualizada!')
      } else {
        await window.api.trips.create(data)
        show('Viagem registrada!')
      }
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro ao salvar', 'error')
    }
  }

  async function edit(row: Trip) {
    try {
      const fuelStops = await window.api.trips.getFuelStops(row.id)
      reset({
        date: row.date,
        truck_id: row.truck_id,
        driver_id: row.driver_id,
        product_id: row.product_id,
        customer_id: row.customer_id ?? '',
        route_id: row.route_id ?? '',
        supplier_id: row.supplier_id ?? '',
        weight_ton: row.weight_ton,
        price_charged: row.price_charged,
        km_driven: row.km_driven,
        observation: row.observation ?? '',
        fuel_stops: fuelStops,
      })
      setEditing(row)
      setModal(true)
    } catch (e: any) {
      show(e.message || 'Erro ao carregar viagem', 'error')
    }
  }

  async function handleDelete(row: Trip) {
    if (!confirm('Excluir esta viagem?')) {
      return
    }
    await window.api.trips.delete(row.id)
    show('Viagem excluída', 'success')
    load()
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
  const totalTon = trips.reduce((s, t) => s + t.weight_ton, 0)

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Operacional"
        title="Viagens"
        subtitle="Gerencie os manifestos de transporte e histórico de fretes."
        actionLabel="Nova Viagem"
        onAction={() => setModal(true)}
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
              options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Motorista"
              value={filters.driver_id}
              onChange={(v) => setFilters((f) => ({ ...f, driver_id: v }))}
              options={drivers.map((d) => ({ value: d.id, label: d.name }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Produto"
              value={filters.product_id}
              onChange={(v) => setFilters((f) => ({ ...f, product_id: v }))}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Cliente"
              value={filters.customer_id}
              onChange={(v) => setFilters((f) => ({ ...f, customer_id: v }))}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              optional
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Rota"
              value={filters.route_id}
              onChange={(v) => setFilters((f) => ({ ...f, route_id: v }))}
              options={routes.map((r) => ({ value: r.id, label: r.name }))}
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
          { label: 'Tonelagem Total', value: `${totalTon.toFixed(1)} ton`, icon: 'scale' },
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
                  Nenhuma viagem encontrada com os filtros selecionados
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
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.weight_ton} ton</td>
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
                      onClick={() => handleDelete(row)}
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

      {/* Modal: Nova Viagem */}
      {modal && (
        <Modal title={editing ? 'Editar Viagem' : 'Nova Viagem'} onClose={() => setModal(false)}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <DatePicker label="Data" {...register('date')} error={errors.date?.message} />

              <Controller
                name="truck_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Caminhão"
                    icon="local_shipping"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.truck_id?.message}
                    options={trucks.map((t) => ({
                      value: t.id,
                      label: `${t.license_plate} — ${t.model}`,
                    }))}
                  />
                )}
              />

              <Controller
                name="driver_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Motorista"
                    icon="person"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.driver_id?.message}
                    options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                  />
                )}
              />

              <Controller
                name="product_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Produto"
                    icon="inventory_2"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.product_id?.message}
                    options={products.map((p) => ({ value: p.id, label: p.name }))}
                  />
                )}
              />

              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Cliente"
                    optional
                    icon="business"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.customer_id?.message}
                    options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
              />

              <Controller
                name="route_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Rota"
                    optional
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.route_id?.message}
                    options={routes.map((r) => {
                      const isSelectedCustomer =
                        r.customer_id && r.customer_id === Number(selectedCustomerId)

                      if (isSelectedCustomer) {
                        return {
                          value: r.id,
                          displayLabel: r.name,
                          label: (
                            <div className="flex items-center justify-between w-full">
                              <span>{r.name}</span>
                              <Badge label="Cliente" color="blue" />
                            </div>
                          ),
                        }
                      }

                      return { value: r.id, label: r.name }
                    })}
                  />
                )}
              />

              <Input
                label="Peso (ton)"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('weight_ton')}
                error={errors.weight_ton?.message}
              />

              <Controller
                name="price_charged"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    label="Valor cobrado"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.price_charged?.message}
                  />
                )}
              />

              <Input
                label="Km total da viagem"
                type="number"
                placeholder="0"
                {...register('km_driven')}
                error={errors.km_driven?.message}
              />

              <div className="col-span-2">
                <Input
                  label="Observação"
                  optional
                  {...register('observation')}
                  error={errors.observation?.message}
                />
              </div>
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
                onClick={handleSubmit(onSubmit)}
                className="flex items-center gap-3 px-8 py-3 bg-primary text-on-primary font-extrabold rounded transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20"
              >
                {editing ? 'Salvar Alterações' : 'Salvar Viagem'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
