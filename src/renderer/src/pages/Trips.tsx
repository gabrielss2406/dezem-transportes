import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Toast, useToast } from '../components/ui'
import type { Customer, Driver, Product, Route, Supplier, Trip, Truck } from '../lib/types'
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

function FormField({
  label,
  icon,
  children,
}: {
  label: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-3 opacity-70">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-4 flex items-center text-primary/60 pointer-events-none">
            <span className="material-symbols-outlined">{icon}</span>
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

const inputCls = (hasIcon = false) =>
  `w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl ${hasIcon ? 'pl-12' : 'px-4'} pr-4 py-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm`

const selectCls = (hasIcon = false) =>
  `w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl ${hasIcon ? 'pl-12' : 'px-4'} pr-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all outline-none text-sm`

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [t, tr, d, p, c, r, s] = await Promise.all([
      window.api.trips.list(),
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      await window.api.trips.create({
        ...form,
        truck_id: Number(form.truck_id),
        driver_id: Number(form.driver_id),
        product_id: Number(form.product_id),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        route_id: form.route_id ? Number(form.route_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        weight_ton: Number(form.weight_ton),
        price_charged: Number(form.price_charged),
        km_driven: Number(form.km_driven),
      })
      show('Viagem registrada!')
      setModal(false)
      setForm({ ...EMPTY })
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
          onClick={() => {
            setForm({ ...EMPTY })
            setModal(true)
          }}
          className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded font-extrabold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Nova Viagem
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
            className="bg-surface-container-low p-6 rounded-xl flex items-center gap-4"
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
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
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
                  Nenhuma viagem registrada
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
              <FormField label="Data">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={inputCls()}
                />
              </FormField>

              <FormField label="Caminhão" icon="local_shipping">
                <select
                  value={form.truck_id}
                  onChange={(e) => set('truck_id', e.target.value)}
                  className={selectCls(true)}
                >
                  <option value="">Selecione...</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.license_plate} — {t.model}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Motorista" icon="person">
                <select
                  value={form.driver_id}
                  onChange={(e) => set('driver_id', e.target.value)}
                  className={selectCls(true)}
                >
                  <option value="">Selecione...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Produto" icon="inventory_2">
                <select
                  value={form.product_id}
                  onChange={(e) => set('product_id', e.target.value)}
                  className={selectCls(true)}
                >
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Cliente (opcional)" icon="business">
                <select
                  value={form.customer_id}
                  onChange={(e) => set('customer_id', e.target.value)}
                  className={selectCls(true)}
                >
                  <option value="">Selecione...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Rota (opcional)">
                <select
                  value={form.route_id}
                  onChange={(e) => set('route_id', e.target.value)}
                  className={selectCls()}
                >
                  <option value="">Selecione...</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Peso (ton)">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.weight_ton}
                  onChange={(e) => set('weight_ton', e.target.value)}
                  className={inputCls()}
                />
              </FormField>

              <FormField label="Valor cobrado (R$)" icon="payments">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.price_charged}
                  onChange={(e) => set('price_charged', e.target.value)}
                  className={inputCls(true)}
                />
              </FormField>

              <FormField label="Km percorrido">
                <input
                  type="number"
                  placeholder="0"
                  value={form.km_driven}
                  onChange={(e) => set('km_driven', e.target.value)}
                  className={inputCls()}
                />
              </FormField>

              <FormField label="Posto (opcional)">
                <select
                  value={form.supplier_id}
                  onChange={(e) => set('supplier_id', e.target.value)}
                  className={selectCls()}
                >
                  <option value="">Selecione...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="col-span-2">
                <FormField label="Observação (opcional)">
                  <input
                    type="text"
                    value={form.observation}
                    onChange={(e) => set('observation', e.target.value)}
                    className={inputCls()}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <button
                onClick={save}
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
