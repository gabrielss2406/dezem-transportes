import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Product } from '../../lib/types'

const UNITS = [
  { value: 'ton', label: 'Tonelada (ton)' },
  { value: 'm3', label: 'Metro cúbico (m³)' },
  { value: 'un', label: 'Unidade' },
]

const EMPTY = { name: '', unit: 'ton' }

export function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.products.list().then(setRows), [])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.products.update(editing.id, form)
      else await window.api.products.create(form)
      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Product) {
    if (!confirm('Excluir este produto?')) return
    await window.api.products.delete(row.id)
    show('Produto excluído')
    load()
  }

  function edit(row: Product) {
    setEditing(row)
    setForm({ name: row.name, unit: row.unit })
    setModal(true)
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão de Inventário
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Catálogo de <span className="text-primary">Produtos</span>
          </h1>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ ...EMPTY })
            setModal(true)
          }}
          className="flex items-center gap-2 bg-surface-container-low border border-primary/20 text-primary px-8 py-4 rounded font-bold text-sm hover:bg-primary hover:text-on-primary active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Novo Produto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Produtos', value: rows.length, icon: 'inventory_2' },
          {
            label: 'Unid. Tonelada',
            value: rows.filter((r) => r.unit === 'ton').length,
            icon: 'scale',
          },
          {
            label: 'Outras Unidades',
            value: rows.filter((r) => r.unit !== 'ton').length,
            icon: 'straighten',
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
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['Nome do Produto', 'Unidade', ''].map((h) => (
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
                <td colSpan={3} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum produto cadastrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const unitLabel = UNITS.find((u) => u.value === row.unit)?.label ?? row.unit
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-surface-container-lowest flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary/50 group-hover:text-primary transition-colors">
                          grain
                        </span>
                      </div>
                      <span className="font-bold text-on-surface text-sm">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase px-2.5 py-1 rounded">
                      {unitLabel}
                    </span>
                  </td>
                  <td className="px-8 py-5">
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
              )
            })}
          </tbody>
        </table>

        <div className="px-8 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} produto{rows.length !== 1 ? 's' : ''} cadastrado
            {rows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input
              label="Nome do produto"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <Select
              label="Unidade"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              options={UNITS}
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
