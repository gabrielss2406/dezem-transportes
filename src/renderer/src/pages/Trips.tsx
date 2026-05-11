import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { tripSchema } from '../../../shared/schemas'
import type { Customer, Driver, Product, Route, Supplier, Trip, Truck } from '../../lib/types'
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
import { formatBRL, formatDate } from '../lib/utils'

const EMPTY = {
  date: '',
  truck_id: '',
  driver_id: '',
  product_id: '',
  customer_id: '',
  route_id: '',
  supplier_id: '',
  weight_ton: '',
  price_charged: '',
  km_driven: '',
  observation: '',
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    control,
  } = useForm<Omit<Trip, 'id'>>({
    resolver: zodResolver(tripSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

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
      reset(EMPTY)
    }
  }, [modal])

  const onSubmit = async (data: Omit<Trip, 'id'>) => {
    try {
      await window.api.trips.create(data)
      show('Viagem registrada!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro ao salvar', 'error')
    }
  }

  async function handleDelete(row: Trip) {
    if (!confirm('Excluir esta viagem?')) return
    await window.api.trips.delete(row.id)
    show('Viagem excluída', 'success')
    load()
  }

  const totalRevenue = trips.reduce((s, t) => s + t.price_charged, 0)
  const totalKm = trips.reduce((s, t) => s + t.km_driven, 0)
  const totalTon = trips.reduce((s, t) => s + t.weight_ton, 0)

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão Operacional
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Viagens
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-xl text-base">
            Gerencie os manifestos de transporte e histórico de fretes.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded font-extrabold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Nova Viagem
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-low p-4 rounded-xl mb-10 flex flex-wrap gap-4 items-end border border-outline-variant/10 shadow-sm">
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
            placeholder="Caminhão"
            value={filters.truck_id}
            onChange={(v) => setFilters((f) => ({ ...f, truck_id: v }))}
            options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
            optional
            className="scale-90 origin-bottom"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            placeholder="Motorista"
            value={filters.driver_id}
            onChange={(v) => setFilters((f) => ({ ...f, driver_id: v }))}
            options={drivers.map((d) => ({ value: d.id, label: d.name }))}
            optional
            className="scale-90 origin-bottom"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            placeholder="Produto"
            value={filters.product_id}
            onChange={(v) => setFilters((f) => ({ ...f, product_id: v }))}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            optional
            className="scale-90 origin-bottom"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            placeholder="Cliente"
            value={filters.customer_id}
            onChange={(v) => setFilters((f) => ({ ...f, customer_id: v }))}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            optional
            className="scale-90 origin-bottom"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            placeholder="Rota"
            value={filters.route_id}
            onChange={(v) => setFilters((f) => ({ ...f, route_id: v }))}
            options={routes.map((r) => ({ value: r.id, label: r.name }))}
            optional
            className="scale-90 origin-bottom"
          />
        </div>
        <button
          onClick={() =>
            setFilters({
              startDate: '',
              endDate: '',
              truck_id: '',
              driver_id: '',
              product_id: '',
              customer_id: '',
              route_id: '',
            })
          }
          className="px-4 py-2 text-primary text-xs font-bold uppercase hover:bg-primary/10 rounded-lg transition-all mb-1"
        >
          Limpar
        </button>
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
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.km_driven} km</td>
                <td className="px-6 py-4 text-sm font-bold text-on-surface">
                  {formatBRL(row.price_charged)}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {row.customer_name ?? '—'}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Nova Viagem */}
      {modal && (
        <Modal title="Nova Viagem" onClose={() => setModal(false)}>
          <div className="space-y-5">
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
                    options={routes.map((r) => ({ value: r.id, label: r.name }))}
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
                label="Km percorrido"
                type="number"
                placeholder="0"
                {...register('km_driven')}
                error={errors.km_driven?.message}
              />

              <Controller
                name="supplier_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Posto"
                    optional
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.supplier_id?.message}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
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
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <button
                onClick={handleSubmit(onSubmit)}
                className="flex items-center gap-3 px-8 py-3 bg-primary text-on-primary font-extrabold rounded transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20"
              >
                Salvar Viagem
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
