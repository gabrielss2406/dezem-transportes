import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import type { Driver, Truck } from '../../lib/types'

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
      
      <PageHeader 
        title="Motoristas" 
        actionLabel="Novo Motorista" 
        onAction={() => { setEditing(null); setForm({ ...EMPTY_DRIVER }); setModal(true) }} 
      />

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
