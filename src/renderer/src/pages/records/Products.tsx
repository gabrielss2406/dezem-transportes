import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { productSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
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
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    control,
  } = useForm<Omit<Product, 'id'>>({
    resolver: zodResolver(productSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(
    () => window.api.products.list(appliedSearch).then(setRows),
    [appliedSearch],
  )
  useEffect(() => {
    load()
  }, [load])

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal])

  const onSubmit = async (data: Omit<Product, 'id'>) => {
    try {
      if (editing) await window.api.products.update(editing.id, data)
      else await window.api.products.create(data)
      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setModal(false)
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
    reset({
      name: row.name,
      unit: row.unit,
    })
    setModal(true)
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão de Inventário"
        title="Catálogo de Produtos"
        actionLabel="Novo Produto"
        onAction={() => setModal(true)}
      >
        <div className="flex items-center bg-surface-container-highest rounded-lg p-1 border border-outline-variant/10 shadow-sm">
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedSearch(search)
              }}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <button
            onClick={() => setAppliedSearch(search)}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
          >
            Filtrar
          </button>
        </div>
      </PageHeader>

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
                  Nenhum produto encontrado
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
          </p>
        </div>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome do produto" {...register('name')} error={errors.name?.message} />
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select
                  label="Unidade"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.unit?.message}
                  options={UNITS}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
