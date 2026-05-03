import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Driver, Truck } from '../../lib/types'
import { formatBRL } from '../../lib/utils'

const EMPTY = { name: '', cpf: '', phone: '', monthly_salary: '', truck_id: '' }

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([window.api.drivers.list(), window.api.trucks.list()])
    setRows(d)
    setTrucks(t)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    const data = {
      ...form,
      monthly_salary: Number(form.monthly_salary),
      truck_id: form.truck_id ? Number(form.truck_id) : null,
    }
    try {
      if (editing) await window.api.drivers.update(editing.id, data)
      else await window.api.drivers.create(data)
      show(editing ? 'Motorista atualizado!' : 'Motorista cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Driver) {
    if (!confirm('Excluir este motorista?')) return
    await window.api.drivers.delete(row.id)
    show('Motorista excluído')
    load()
  }

  function edit(row: Driver) {
    setEditing(row)
    setForm({
      name: row.name,
      cpf: row.cpf ?? '',
      phone: row.phone ?? '',
      monthly_salary: row.monthly_salary,
      truck_id: row.truck_id ?? '',
    })
    setModal(true)
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão de Frota
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Motoristas
          </h1>
          <p className="text-on-surface-variant mt-2 text-base">
            Gerencie os motoristas vinculados à frota.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ ...EMPTY })
            setModal(true)
          }}
          className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
          Novo Motorista
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Motoristas', value: rows.length, icon: 'badge' },
          {
            label: 'Com Caminhão Vinculado',
            value: rows.filter((r) => r.truck_id).length,
            icon: 'local_shipping',
          },
          {
            label: 'Folha Mensal',
            value: formatBRL(rows.reduce((s, r) => s + r.monthly_salary, 0)),
            icon: 'payments',
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-surface-container-low p-6 rounded-lg relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">{icon}</span>
            </div>
            <p className="text-on-surface-variant text-sm mb-1">{label}</p>
            <p className="text-3xl font-black font-headline text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['Nome', 'CPF', 'Telefone', 'Salário', 'Caminhão', ''].map((h) => (
                <th
                  key={h}
                  className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum motorista cadastrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center text-[10px] font-bold text-on-surface-variant shrink-0">
                      {initials(row.name)}
                    </div>
                    <span className="font-bold text-on-surface text-sm">{row.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                  {row.cpf || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.phone || '—'}</td>
                <td className="px-6 py-4 text-sm font-medium text-primary">
                  {formatBRL(row.monthly_salary)}
                </td>
                <td className="px-6 py-4">
                  {row.truck_license_plate ? (
                    <span className="font-mono font-bold text-primary text-sm">
                      {row.truck_license_plate}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => edit(row)}
                      className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} motorista{rows.length !== 1 ? 's' : ''} cadastrado
            {rows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Motorista' : 'Novo Motorista'}
          onClose={() => setModal(false)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <Input
              label="CPF"
              optional
              value={form.cpf}
              onChange={(e) => set('cpf', e.target.value)}
            />
            <Input
              label="Telefone"
              optional
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label="Salário mensal (R$)"
              type="number"
              value={form.monthly_salary}
              onChange={(e) => set('monthly_salary', e.target.value)}
            />
            <Select
              label="Caminhão vinculado"
              optional
              value={form.truck_id}
              onChange={(e) => set('truck_id', e.target.value)}
              options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
