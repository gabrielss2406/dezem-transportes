import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Input, Modal, Table, Toast, useToast } from '../../components/ui'
import type { Truck } from '../../lib/types'

const EMPTY_TRUCK = {
  license_plate: '',
  model: '',
  year: '',
  capacity_ton: '',
  current_odometer: '',
}

export function TrucksPage() {
  const [rows, setRows] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_TRUCK })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.trucks.list().then(setRows), [])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    const data = {
      ...form,
      year: Number(form.year),
      capacity_ton: Number(form.capacity_ton),
      current_odometer: Number(form.current_odometer),
    }
    try {
      if (editing) await window.api.trucks.update(editing.id, data)
      else await window.api.trucks.create(data)
      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY_TRUCK })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Truck) {
    if (!confirm('Excluir este caminhão?')) return
    await window.api.trucks.delete(row.id)
    show('Caminhão excluído')
    load()
  }

  function edit(row: Truck) {
    setEditing(row)
    setForm({
      license_plate: row.license_plate,
      model: row.model,
      year: row.year ?? '',
      capacity_ton: row.capacity_ton ?? '',
      current_odometer: row.current_odometer,
    })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="Caminhões"
        actionLabel="Novo Caminhão"
        onAction={() => {
          setEditing(null)
          setForm({ ...EMPTY_TRUCK })
          setModal(true)
        }}
      />

      <Table
        columns={[
          { key: 'license_plate', label: 'Placa' },
          { key: 'model', label: 'Modelo' },
          { key: 'year', label: 'Ano' },
          {
            key: 'capacity_ton',
            label: 'Capacidade',
            render: (r) => (r.capacity_ton ? `${r.capacity_ton} ton` : '—'),
          },
          {
            key: 'current_odometer',
            label: 'Odômetro',
            render: (r) => `${r.current_odometer.toFixed(0)} km`,
          },
        ]}
        data={rows}
        onEdit={edit}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal
          title={editing ? 'Editar Caminhão' : 'Novo Caminhão'}
          onClose={() => setModal(false)}
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa"
              value={form.license_plate}
              onChange={(e) => set('license_plate', e.target.value)}
              placeholder="ABC-1234"
            />
            <Input
              label="Modelo"
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
            />
            <Input
              label="Ano"
              type="number"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
            />
            <Input
              label="Capacidade (ton)"
              type="number"
              value={form.capacity_ton}
              onChange={(e) => set('capacity_ton', e.target.value)}
            />
            <Input
              label="Odômetro inicial (km)"
              type="number"
              value={form.current_odometer}
              onChange={(e) => set('current_odometer', e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              className="text-sm text-[#9e8c75] hover:text-[#4a3419]"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
            <button
              className="bg-[#7B5B2E] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#5e4320]"
              onClick={save}
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
