import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { supplierSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Supplier } from '../../lib/types'

const EMPTY = { name: '', type: 'gas_station' as Supplier['type'], phone: '' }

const typeIcon: Record<string, string> = {
  gas_station: 'local_gas_station',
  workshop: 'build',
  quarry: 'foundation',
  other: 'handshake',
}

export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [supplierTypes, setSupplierTypes] = useState<{ value: string; label: string }[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [filters, setFilters] = useState({ name: '', type: '' })
  const [appliedFilters, setAppliedFilters] = useState({ name: '', type: '' })
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<Omit<Supplier, 'id'>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(00) 00000-0000'
      : '(00) 0000-0000'

  const load = useCallback(async () => {
    const [s, st] = await Promise.all([
      window.api.suppliers.list(appliedFilters),
      window.api['supplier-types'].list(),
    ])
    setRows(s)
    setSupplierTypes(st)
  }, [appliedFilters])

  useEffect(() => {
    load()
  }, [load])

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal, reset])

  const onSubmit = async (data: Omit<Supplier, 'id'>) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.suppliers.update(editing.id, data)
      } else {
        res = await window.api.suppliers.create(data)
      }

      if (res && res.ok === false) {
        const msg = res.errors ? Object.values(res.errors)[0] : 'Erro ao salvar dados'
        show(String(msg), 'error')
        return
      }

      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  async function handleDelete(row: Supplier) {
    if (!confirm('Excluir este fornecedor?')) {
      return
    }
    await window.api.suppliers.delete(row.id)
    show('Fornecedor excluído')
    load()
  }

  function edit(row: Supplier) {
    setEditing(row)
    reset({
      name: row.name,
      type: row.type,
      phone: row.phone ?? '',
    })
    setModal(true)
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Operacional"
        title="Fornecedores"
        actionLabel="Novo Fornecedor"
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
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedFilters(filters)
                }
              }}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <div className="w-[1px] bg-outline-variant/20 h-6 mx-1" />
          <div className="w-36">
            <Select
              placeholder="Tipo"
              value={filters.type}
              onChange={(val) => setFilters((f) => ({ ...f, type: val }))}
              options={supplierTypes}
              optional
              className="scale-75 origin-left -ml-2"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters(filters)}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
          >
            Filtrar
          </button>
        </div>
      </PageHeader>

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
                  Nenhum fornecedor encontrado com os filtros selecionados
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const typeLabel = supplierTypes.find((t) => t.value === row.type)?.label ?? row.type
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
                        type="button"
                        onClick={() => edit(row)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        type="button"
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
            <Input label="Nome" {...register('name')} error={errors.name?.message} />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  label="Tipo"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.type?.message}
                  options={supplierTypes}
                />
              )}
            />
            <Input
              label="Telefone"
              optional
              mask={phoneMask}
              {...register('phone')}
              error={errors.phone?.message}
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
