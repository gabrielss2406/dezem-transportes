import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../components/ui'
import { SUPPLIER_TYPES } from '../lib/utils'
import type { Truck, Driver, Customer, Product, Supplier } from '../lib/types'

// ── TRUCKS ───────────────────────────────────────────────────────────────────
const EMPTY_TRUCK = { license_plate: '', model: '', year: '', capacity_ton: '', current_odometer: '' }
export function TrucksPage() {
  const [rows, setRows] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_TRUCK })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.trucks.list().then(setRows), [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    const data = { ...form, year: Number(form.year), capacity_ton: Number(form.capacity_ton), current_odometer: Number(form.current_odometer) }
    try {
      if (editing) await window.api.trucks.update(editing.id, data)
      else await window.api.trucks.create(data)
      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_TRUCK }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Truck) {
    if (!confirm('Excluir este caminhão?')) return
    await window.api.trucks.delete(row.id)
    show('Caminhão excluído'); load()
  }

  function edit(row: Truck) {
    setEditing(row)
    setForm({ license_plate: row.license_plate, model: row.model, year: row.year ?? '', capacity_ton: row.capacity_ton ?? '', current_odometer: row.current_odometer })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Caminhões</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_TRUCK }); setModal(true) }}>+ Novo Caminhão</Button>
      </div>
      <Table
        columns={[
          { key: 'license_plate', label: 'Placa' },
          { key: 'model', label: 'Modelo' },
          { key: 'year', label: 'Ano' },
          { key: 'capacity_ton', label: 'Capacidade', render: (r) => r.capacity_ton ? `${r.capacity_ton} ton` : '—' },
          { key: 'current_odometer', label: 'Odômetro', render: (r) => `${r.current_odometer.toFixed(0)} km` }
        ]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Caminhão' : 'Novo Caminhão'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Placa" value={form.license_plate} onChange={(e) => set('license_plate', e.target.value)} placeholder="ABC-1234" />
            <Input label="Modelo" value={form.model} onChange={(e) => set('model', e.target.value)} />
            <Input label="Ano" type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />
            <Input label="Capacidade (ton)" type="number" value={form.capacity_ton} onChange={(e) => set('capacity_ton', e.target.value)} />
            <Input label="Odômetro inicial (km)" type="number" value={form.current_odometer} onChange={(e) => set('current_odometer', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── DRIVERS ──────────────────────────────────────────────────────────────────
const EMPTY_DRIVER = { name: '', cpf: '', phone: '', monthly_salary: '', truck_id: '' }
export function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_DRIVER })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([window.api.drivers.list(), window.api.trucks.list()])
    setRows(d); setTrucks(t)
  }, [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    const data = { ...form, monthly_salary: Number(form.monthly_salary), truck_id: form.truck_id ? Number(form.truck_id) : null }
    try {
      if (editing) await window.api.drivers.update(editing.id, data)
      else await window.api.drivers.create(data)
      show(editing ? 'Motorista atualizado!' : 'Motorista cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_DRIVER }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Driver) {
    if (!confirm('Excluir este motorista?')) return
    await window.api.drivers.delete(row.id)
    show('Motorista excluído'); load()
  }

  function edit(row: Driver) {
    setEditing(row)
    setForm({ name: row.name, cpf: row.cpf ?? '', phone: row.phone ?? '', monthly_salary: row.monthly_salary, truck_id: row.truck_id ?? '' })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Motoristas</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_DRIVER }); setModal(true) }}>+ Novo Motorista</Button>
      </div>
      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'cpf', label: 'CPF' },
          { key: 'phone', label: 'Telefone' },
          { key: 'monthly_salary', label: 'Salário', render: (r) => `R$ ${r.monthly_salary.toFixed(2)}` },
          { key: 'truck_license_plate', label: 'Caminhão' }
        ]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Motorista' : 'Novo Motorista'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Input label="CPF" optional value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
            <Input label="Telefone" optional value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Salário mensal (R$)" type="number" value={form.monthly_salary} onChange={(e) => set('monthly_salary', e.target.value)} />
            <Select label="Caminhão vinculado" optional value={form.truck_id} onChange={(e) => set('truck_id', e.target.value)}
              options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── CUSTOMERS ────────────────────────────────────────────────────────────────
const EMPTY_CUSTOMER = { name: '', cnpj: '', ie: '', phone: '', address: '' }
export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_CUSTOMER })
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.customers.list(search).then(setRows), [search])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.customers.update(editing.id, form)
      else await window.api.customers.create(form)
      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_CUSTOMER }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Customer) {
    if (!confirm('Excluir este cliente?')) return
    await window.api.customers.delete(row.id)
    show('Cliente excluído'); load()
  }

  function edit(row: Customer) {
    setEditing(row)
    setForm({ name: row.name, cnpj: row.cnpj ?? '', ie: row.ie ?? '', phone: row.phone ?? '', address: row.address ?? '' })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Clientes</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_CUSTOMER }); setModal(true) }}>+ Novo Cliente</Button>
      </div>
      <div className="mb-4">
        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'cnpj', label: 'CNPJ' },
          { key: 'ie', label: 'Inscrição Estadual' },
          { key: 'phone', label: 'Telefone' }
        ]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <Input label="CNPJ" optional value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            <Input label="Inscrição Estadual" optional value={form.ie} onChange={(e) => set('ie', e.target.value)} />
            <Input label="Telefone" optional value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Endereço" optional value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
export function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'ton' })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.products.list().then(setRows), [])
  useEffect(() => { load() }, [load])

  async function save() {
    try {
      if (editing) await window.api.products.update(editing.id, form)
      else await window.api.products.create(form)
      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setModal(false); setEditing(null); setForm({ name: '', unit: 'ton' }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Product) {
    if (!confirm('Excluir este produto?')) return
    await window.api.products.delete(row.id)
    show('Produto excluído'); load()
  }

  function edit(row: Product) {
    setEditing(row); setForm({ name: row.name, unit: row.unit }); setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Produtos</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', unit: 'ton' }); setModal(true) }}>+ Novo Produto</Button>
      </div>
      <Table
        columns={[{ key: 'name', label: 'Nome' }, { key: 'unit', label: 'Unidade' }]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome do produto" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Select label="Unidade" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              options={[{ value: 'ton', label: 'Tonelada (ton)' }, { value: 'm3', label: 'Metro cúbico (m³)' }, { value: 'un', label: 'Unidade' }]} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SUPPLIERS ────────────────────────────────────────────────────────────────
const EMPTY_SUPPLIER = { name: '', type: 'gas_station', phone: '' }
export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_SUPPLIER })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.suppliers.list().then(setRows), [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.suppliers.update(editing.id, form)
      else await window.api.suppliers.create(form)
      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_SUPPLIER }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Supplier) {
    if (!confirm('Excluir este fornecedor?')) return
    await window.api.suppliers.delete(row.id)
    show('Fornecedor excluído'); load()
  }

  function edit(row: Supplier) {
    setEditing(row); setForm({ name: row.name, type: row.type, phone: row.phone ?? '' }); setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Fornecedores</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_SUPPLIER }); setModal(true) }}>+ Novo Fornecedor</Button>
      </div>
      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'type', label: 'Tipo', render: (r) => SUPPLIER_TYPES.find(t => t.value === r.type)?.label ?? r.type },
          { key: 'phone', label: 'Telefone' }
        ]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Select label="Tipo" value={form.type} onChange={(e) => set('type', e.target.value)} options={SUPPLIER_TYPES} />
            <Input label="Telefone" optional value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
