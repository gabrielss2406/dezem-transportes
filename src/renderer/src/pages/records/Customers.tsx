import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Customer } from '../../lib/types'

const EMPTY: Omit<Customer, 'id'> = { name: '', cnpj: '', ie: '', phone: '', address: '' }

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.customers.list(search).then(setRows), [search])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.customers.update(editing.id, form)
      else await window.api.customers.create(form)
      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Customer) {
    if (!confirm('Excluir este cliente?')) return
    await window.api.customers.delete(row.id)
    show('Cliente excluído')
    load()
  }

  function edit(row: Customer) {
    setEditing(row)
    setForm({
      name: row.name,
      cnpj: row.cnpj ?? '',
      ie: row.ie ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
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
            Gestão Operacional
          </span>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface">
            Clientes
          </h1>
          <p className="text-on-surface-variant mt-1">Gerencie sua base de parceiros comerciais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 bg-surface-container-highest border-none rounded-lg w-64 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm outline-none text-on-surface"
            />
          </div>
          <button
            onClick={() => {
              setEditing(null)
              setForm({ ...EMPTY })
              setModal(true)
            }}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['Nome', 'CNPJ', 'Inscrição Estadual', 'Telefone', ''].map((h) => (
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
                <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-primary/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary shrink-0">
                      <span className="material-symbols-outlined text-xl">business</span>
                    </div>
                    <span className="font-bold text-on-surface font-headline text-sm">
                      {row.name}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 font-mono text-sm text-on-surface-variant">
                  {row.cnpj || '—'}
                </td>
                <td className="px-8 py-5 font-mono text-sm text-on-surface-variant">
                  {row.ie || '—'}
                </td>
                <td className="px-8 py-5 text-sm text-on-surface font-medium">
                  {row.phone || '—'}
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Footer */}
        <div className="px-8 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} cliente{rows.length !== 1 ? 's' : ''} encontrado
            {rows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <Input
              label="CNPJ"
              optional
              value={form.cnpj}
              onChange={(e) => set('cnpj', e.target.value)}
            />
            <Input
              label="Inscrição Estadual"
              optional
              value={form.ie}
              onChange={(e) => set('ie', e.target.value)}
            />
            <Input
              label="Telefone"
              optional
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label="Endereço"
              optional
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
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
