import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Toast, useToast } from '../components/ui'
import type { Cost, Driver, Supplier, Truck } from '../lib/types'
import { COST_CATEGORIES, currentMonthKey, formatBRL, formatDate } from '../lib/utils'

const EMPTY = {
  date: '',
  category: '',
  value: '',
  truck_id: '',
  supplier_id: '',
  driver_id: '',
  description: '',
}

const categoryBadge: Record<string, string> = {
  fuel: 'bg-secondary-container text-on-secondary-container',
  oil: 'bg-secondary-container text-on-secondary-container',
  maintenance: 'bg-tertiary-container/30 text-tertiary',
  salary: 'bg-primary/10 text-primary',
  toll: 'bg-surface-container-highest text-on-surface-variant',
  others: 'bg-surface-container-highest text-on-surface-variant',
}

export function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [modal, setModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [c, tr, s, d] = await Promise.all([
      window.api.costs.list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list(),
    ])
    setCosts(c)
    setTrucks(tr)
    setSuppliers(s)
    setDrivers(d)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      await window.api.costs.create({
        ...form,
        value: Number(form.value),
        truck_id: form.truck_id ? Number(form.truck_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        driver_id: form.driver_id ? Number(form.driver_id) : null,
      })
      show('Custo lançado!')
      setModal(false)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message || 'Erro', 'error')
    }
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
  const filtered = filterCategory ? costs.filter((c) => c.category === filterCategory) : costs

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão Financeira
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Custos da Frota
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-xl text-base">
            Gerencie as despesas operacionais com precisão.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-surface-container-low p-5 rounded-xl text-right min-w-[200px]">
            <p className="text-xs text-on-surface-variant mb-1">Total do Período</p>
            <p className="text-3xl font-black font-headline text-primary">{formatBRL(total)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={issueSalaries}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/40 rounded transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Lançar Salários
            </button>
            <button
              onClick={() => {
                setForm({ ...EMPTY })
                setModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Custo
            </button>
          </div>
        </div>
      </div>

      {/* Asymmetric grid: form left, table right */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Quick-add form */}
        <div className="col-span-4 bg-surface-container-low p-8 rounded-xl border-l-4 border-primary relative">
          <h4 className="text-base font-headline font-bold mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">add_circle</span>
            Lançar Custo
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block mb-1.5">
                Categoria
              </label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Selecione...</option>
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block mb-1.5">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block mb-1.5">
                Veículo (opcional)
              </label>
              <select
                value={form.truck_id}
                onChange={(e) => set('truck_id', e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Selecione...</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.license_plate}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block mb-1.5">
                Descrição (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes da despesa..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
            <button
              onClick={save}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg shadow-xl shadow-primary/10 hover:brightness-110 active:scale-95 transition-all text-sm"
            >
              Confirmar Lançamento
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="col-span-8 space-y-6">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                !filterCategory
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright cursor-pointer'
              }`}
            >
              {!filterCategory && <span className="material-symbols-outlined text-sm">check</span>}
              Todos
            </button>
            {COST_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)}
                className={`px-4 py-2 rounded text-xs font-bold transition-colors ${
                  filterCategory === c.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright cursor-pointer'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Data', 'Descrição', 'Veículo', 'Categoria', 'Valor', ''].map((h) => (
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
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo registrado
                    </td>
                  </tr>
                )}
                {filtered.map((row) => {
                  const cat = COST_CATEGORIES.find((c) => c.value === row.category)
                  return (
                    <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface text-sm">
                          {row.description || '—'}
                        </p>
                        {row.supplier_name && (
                          <p className="text-[10px] text-on-surface-variant">{row.supplier_name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                        {row.truck_license_plate ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${
                            categoryBadge[row.category] ??
                            'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {cat?.label ?? row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                        {formatBRL(row.value)}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <Modal title="Novo Custo" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                Categoria
              </label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
              >
                <option value="">Selecione...</option>
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {[
              { label: 'Data', key: 'date', type: 'date' },
              { label: 'Valor (R$)', key: 'value', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
            ))}
            {[
              {
                label: 'Veículo',
                key: 'truck_id',
                options: trucks.map((t) => ({ value: t.id, label: t.license_plate })),
              },
              {
                label: 'Fornecedor',
                key: 'supplier_id',
                options: suppliers.map((s) => ({ value: s.id, label: s.name })),
              },
              {
                label: 'Motorista',
                key: 'driver_id',
                options: drivers.map((d) => ({ value: d.id, label: d.name })),
              },
            ].map(({ label, key, options }) => (
              <div key={key}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  {label} <span className="text-outline font-normal normal-case">(opcional)</span>
                </label>
                <select
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
                >
                  <option value="">Selecione...</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                Descrição <span className="text-outline font-normal normal-case">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar Custo</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
