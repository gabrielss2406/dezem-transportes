import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { supplierSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Supplier } from '../../lib/types'

interface SupplierFormData {
  name: string
  type?: string
  phone?: string
  customId?: number
  customer_id?: number | null
}

const EMPTY_VALUES: SupplierFormData = {
  name: '',
  type: 'gas_station',
  phone: '',
  customId: undefined,
  customer_id: null,
}

const typeIcon: Record<string, string> = {
  gas_station: 'local_gas_station',
  workshop: 'build',
  quarry: 'foundation',
  other: 'handshake',
}

// Modal de confirmação próprio — sem confirm() nativo do Electron
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setTimeout(() => confirmBtnRef.current?.focus(), 50)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-6">
        <p className="text-sm text-on-surface">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button ref={confirmBtnRef} onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [supplierTypes, setSupplierTypes] = useState<{ value: string; label: string }[]>([])
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [filters, setFilters] = useState({ name: '', type: '' })
  const [appliedFilters, setAppliedFilters] = useState({ name: '', type: '' })
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const customIdRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const typeSelectRef = useRef<any>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    watch,
    setValue,
    setError,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: EMPTY_VALUES,
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(00) 00000-0000'
      : '(00) 0000-0000'

  const load = useCallback(async () => {
    const [s, st, c] = await Promise.all([
      window.api.suppliers.list(appliedFilters as any),
      window.api['supplier-types'].list(),
      window.api.customers.list(),
    ])
    setRows(s)
    setSupplierTypes(st)
    setCustomers(c)
  }, [appliedFilters])

  useEffect(() => {
    load()
  }, [load])

  const findNextAvailableId = useCallback(() => {
    const usedIds = new Set(rows.map((r) => r.customId).filter((id): id is number => !!id))
    let nextId = 1
    while (usedIds.has(nextId)) {
      nextId++
    }
    return nextId
  }, [rows])

  // Foco inteligente e sugestão de ID
  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        if (!editing) {
          const nextId = findNextAvailableId()
          setValue('customId', nextId as any, { shouldValidate: false })
          nameRef.current?.focus()
        } else {
          customIdRef.current?.focus()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY_VALUES)
    }
  }, [modal, editing, reset, setValue, findNextAvailableId])

  const save = async (data: SupplierFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.suppliers.update(editing.id, data as any)
      } else {
        res = await window.api.suppliers.create(data as any)
      }

      if (res && res.ok === false) {
        setPendingData(null)
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            let finalMessage = message as string
            if (field === 'customId' && finalMessage.toLowerCase().includes('uso')) {
              const suggestion = findNextAvailableId()
              finalMessage = `${finalMessage}. Sugestão: ${suggestion}`
            }
            setError(field as any, {
              type: 'manual',
              message: finalMessage,
            })
          }
        } else {
          show('Ocorreu um erro ao salvar.', 'error')
        }
        return
      }

      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false)
      setPendingData(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  const onSubmit = (data: SupplierFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: SupplierFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const res: any = await window.api.suppliers.delete(deleteTarget.id)
    if (res && res.ok === false) {
      show(res.errors?.form || 'Não foi possível excluir este fornecedor.', 'error')
    } else {
      show('Fornecedor excluído')
    }
    setDeleteTarget(null)
    load()
  }

  function edit(row: Supplier) {
    setEditing(row)
    reset({
      name: row.name,
      type: row.type,
      phone: row.phone ?? '',
      customId: row.customId ?? undefined,
      customer_id: row.customer_id ?? null,
    })
    setModal(true)
  }

  const handleEscape = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      setModal(false)
    }
  }

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false)
    setModal(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setAppliedFilters(filters)
    }
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Operacional"
        title="Fornecedores"
        actionLabel="Novo Fornecedor"
        onAction={() => {
          window.focus()
          setModal(true)
        }}
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
              onKeyDown={handleKeyDown}
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
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['ID', 'Nome', 'Tipo', 'Telefone', ''].map((h) => (
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
                  Nenhum fornecedor encontrado com os filtros selecionados
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const typeLabel = supplierTypes.find((t) => t.value === row.type)?.label ?? row.type
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
                >
                  <td className="px-8 py-5 font-mono text-sm text-on-surface-variant">
                    {row.customId || '—'}
                  </td>
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
                        className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
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
            {rows.length} fornecedor{rows.length !== 1 ? 'es' : ''} encontrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="flex flex-col gap-4">
            <Controller
              name="customId"
              control={control}
              render={({ field }) => (
                <Input
                  ref={customIdRef}
                  label="ID Personalizado"
                  type="number"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.customId?.message}
                  onKeyDown={(e) => e.key === 'Enter' && nameRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  ref={nameRef}
                  label="Nome"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.name?.message}
                  onKeyDown={(e) => e.key === 'Enter' && typeSelectRef.current?.open()}
                />
              )}
            />
            <Controller
              name="customer_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Cliente vinculado (crédito de óleo)"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.customer_id?.message}
                  options={customers.map((customer) => ({
                    value: customer.id,
                    label: customer.name,
                  }))}
                />
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  ref={typeSelectRef}
                  label="Tipo"
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => phoneRef.current?.focus()}
                  error={errors.type?.message}
                  options={supplierTypes}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  ref={phoneRef}
                  label="Telefone"
                  optional
                  mask={phoneMask}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(onEnterSubmit)()
                    }
                  }}
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

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este fornecedor?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este fornecedor?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
