import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../components/ui'
import { formatBRL, formatDate } from '../lib/utils'
import type { Trip, Truck, Driver, Product, Customer, Route, Supplier } from '../lib/types'

const EMPTY = { date: '', truck_id: '', driver_id: '', product_id: '', customer_id: '', route_id: '', supplier_id: '', weight_ton: '', price_charged: '', km_driven: '', observation: '' }

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
      window.api.suppliers.list()
    ])
    setTrips(t); setTrucks(tr); setDrivers(d); setProducts(p)
    setCustomers(c); setRoutes(r); setSuppliers(s)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      await window.api.trips.create({
        ...form,
        truck_id: Number(form.truck_id),
        driver_id: Number(form.driver_id),
        product_id: Number(form.product_id),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        route_id: form.route_id ? Number(form.rota_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        weight_ton: Number(form.weight_ton),
        price_charged: Number(form.price_charged),
        km_driven: Number(form.km_driven)
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
    <div className="p-8 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Viagens</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setModal(true) }}>+ Nova Viagem</Button>
      </div>

      {/* Totalizers */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Receita total</p>
          <p className="text-xl font-bold text-[#7B5B2E]">{formatBRL(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Km total</p>
          <p className="text-xl font-bold text-[#2a1f14]">{totalKm.toFixed(0)} km</p>
        </div>
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Tonelagem total</p>
          <p className="text-xl font-bold text-[#2a1f14]">{totalTon.toFixed(1)} ton</p>
        </div>
      </div>

      <Table
        columns={[
          { key: 'date', label: 'Data', render: (r) => formatDate(r.date) },
          { key: 'truck_license_plate', label: 'Caminhão' },
          { key: 'driver_name', label: 'Motorista' },
          { key: 'product_name', label: 'Produto' },
          { key: 'weight_ton', label: 'Peso (ton)', render: (r) => `${r.weight_ton} ton` },
          { key: 'km_driven', label: 'Km', render: (r) => `${r.km_driven} km` },
          { key: 'price_charged', label: 'Valor', render: (r) => formatBRL(r.price_charged) },
          { key: 'customer_name', label: 'Cliente' }
        ]}
        data={trips}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title="Nova Viagem" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <Select label="Caminhão" value={form.truck_id} onChange={(e) => set('truck_id', e.target.value)}
              options={trucks.map((t) => ({ value: t.id, label: `${t.license_plate} — ${t.model}` }))} />
            <Select label="Motorista" value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)}
              options={drivers.map((d) => ({ value: d.id, label: d.name }))} />
            <Select label="Produto" value={form.product_id} onChange={(e) => set('product_id', e.target.value)}
              options={products.map((p) => ({ value: p.id, label: p.name }))} />
            <Input label="Peso (ton)" type="number" value={form.weight_ton} onChange={(e) => set('weight_ton', e.target.value)} />
            <Input label="Preço cobrado (R$)" type="number" value={form.price_charged} onChange={(e) => set('price_charged', e.target.value)} />
            <Input label="Km percorrido" type="number" value={form.km_driven} onChange={(e) => set('km_driven', e.target.value)} />
            <Select label="Cliente" optional value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Rota" optional value={form.route_id} onChange={(e) => set('route_id', e.target.value)}
              options={routes.map((r) => ({ value: r.id, label: r.name }))} />
            <Select label="Posto (fornecedor)" optional value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            <div className="col-span-2">
              <Input label="Observação" optional value={form.observation} onChange={(e) => set('observation', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar Viagem</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
