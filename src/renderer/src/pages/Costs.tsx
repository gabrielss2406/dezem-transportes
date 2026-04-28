import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast, Badge } from '../components/ui'
import { formatBRL, formatDate, COST_CATEGORIES, currentMonthKey } from '../lib/utils'
import type { Cost, Truck, Supplier, Driver } from '../lib/types'

const EMPTY = { date: '', category: '', value: '', truck_id: '', supplier_id: '', driver_id: '', description: '' }

const categoryColor: Record<string, 'blue' | 'amber' | 'red' | 'green' | 'gray'> = {
  fuel: 'blue', oil: 'amber', maintenance: 'red', salary: 'green', toll: 'gray', others: 'gray'
}

export function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [c, tr, s, d] = await Promise.all([
      window.api.costs.list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list()
    ])
    setCosts(c); setTrucks(tr); setSuppliers(s); setDrivers(d)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      await window.api.costs.create({
        ...form,
        value: Number(form.value),
        truck_id: form.truck_id ? Number(form.truck_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        driver_id: form.driver_id ? Number(form.driver_id) : null
      })
      show('Custo lançado!')
      setModal(false); setForm({ ...EMPTY }); load()
    } catch (e: any) { show(e.message || 'Erro', 'error') }
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

  return (
    <div className="p-8 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Custos</h1>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={issueSalaries}>💰 Lançar Salários do Mês</Button>
          <Button onClick={() => { setForm({ ...EMPTY }); setModal(true) }}>+ Novo Custo</Button>
        </div>
      </div>

      <div className="bg-[#7B5B2E] text-white rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">TOTAL DE CUSTOS</span>
        <span className="text-2xl font-bold">{formatBRL(total)}</span>
      </div>

      <Table
        columns={[
          { key: 'date', label: 'Data', render: (r) => formatDate(r.date) },
          { key: 'category', label: 'Categoria', render: (r) => {
            const cat = COST_CATEGORIES.find(c => c.value === r.category)
            return <Badge label={cat?.label || r.category} color={categoryColor[r.category] || 'gray'} />
          }},
          { key: 'truck_license_plate', label: 'Caminhão' },
          { key: 'supplier_name', label: 'Fornecedor' },
          { key: 'description', label: 'Descrição' },
          { key: 'value', label: 'Valor', render: (r) => formatBRL(r.value) }
        ]}
        data={costs}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title="Novo Custo" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)} options={COST_CATEGORIES} />
            <Input label="Valor (R$)" type="number" value={form.value} onChange={(e) => set('value', e.target.value)} />
            <Select label="Caminhão" optional value={form.truck_id} onChange={(e) => set('truck_id', e.target.value)}
              options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))} />
            <Select label="Fornecedor" optional value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            <Select label="Motorista" optional value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)}
              options={drivers.map((d) => ({ value: d.id, label: d.name }))} />
            <div className="col-span-2">
              <Input label="Descrição" optional value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar Custo</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
