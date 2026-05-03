import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Supplier } from '../../lib/types'
import { SUPPLIER_TYPES } from '../../lib/utils'

const EMPTY = { name: '', type: 'gas_station' as Supplier['type'], phone: '' }

const typeIcon: Record<string, string> = {
  gas_station: 'local_gas_station',
  workshop: 'build',
  quarry: 'foundation',
  other: 'handshake',
}

export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.suppliers.list().then(setRows), [])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.suppliers.update(editing.id, form)
      else await window.api.suppliers.create(form)
      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Supplier) {
    if (!confirm('Excluir este fornecedor?')) return
    await window.api.suppliers.delete(row.id)
    show('Fornecedor excluído')
    load()
  }

  function edit(row: Supplier) {
    setEditing(row)
    setForm({ name: row.name, type: row.type, phone: row.phone ?? '' })
    setModal(true)
  }

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
            Fornecedores
          </h1>
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
          Novo Fornecedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Fornecedores', value: rows.length, icon: 'handshake' },
          {
            label: 'Postos de Combustível',
            value: rows.filter((r) => r.type === 'gas_station').length,
            icon: 'local_gas_station',
          },
          {
            label: 'Oficinas',
            value: rows.filter((r) => r.type === 'workshop').length,
            icon: 'build',
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
            <p className="text-4xl font-black font-headline text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-lg overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high/50">
              {['Nome', 'Tipo', 'Telefone', ''].map((h) => (
                <th
                  key={h}
                  className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum fornecedor cadastrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const typeLabel = SUPPLIER_TYPES.find((t) => t.value === row.type)?.label ?? row.type
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-bright/10 transition-colors group ${
                    i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
                  }`}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        <span className="material-symbols-outlined text-xl">
                          {typeIcon[row.type] ?? 'handshake'}
                        </span>
                      </div>
                      <span className="font-bold text-on-surface text-sm">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase px-2.5 py-1 rounded">
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-on-surface-variant font-mono">
                    {row.phone || '—'}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => edit(row)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          onClose={() => setModal(false)}
        >
          <div className="flex flex-col gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Select
              label="Tipo"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              options={SUPPLIER_TYPES}
            />
            <Input
              label="Telefone"
              optional
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
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
