import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { productSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import {
  Button,
  CurrencyInput,
  Input,
  Modal,
  Select,
  Table,
  Toast,
  useToast,
} from '../../components/ui'
import type { Product } from '../../lib/types'
import { formatBRL } from '../../lib/utils'

interface ProductFormData {
  name: string
  customId?: number
  unit_value?: number | null
}

const EMPTY: ProductFormData = { name: '', customId: undefined, unit_value: null }

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

export function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [modal, setModal] = useState(false)
  const [pricesModal, setPricesModal] = useState<Product | null>(null)
  const [productPrices, setProductPrices] = useState<any[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const customIdRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const unitValueRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    setValue,
    setError,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
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

  const findNextAvailableId = useCallback(() => {
    const usedIds = new Set(rows.map((r) => r.customId).filter((id): id is number => !!id))
    let nextId = 1
    while (usedIds.has(nextId)) {
      nextId++
    }
    return nextId
  }, [rows])

  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        if (!editing) {
          const nextId = findNextAvailableId()
          setValue('customId', nextId as any, { shouldValidate: false })
          nameRef.current?.focus()
        } else {
          nameRef.current?.focus()
          nameRef.current?.select()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal, editing, reset, setValue, findNextAvailableId])

  useEffect(() => {
    if (pricesModal) {
      window.api.customerPrices.listByProduct(pricesModal.id).then(setProductPrices)
    } else {
      setProductPrices([])
    }
  }, [pricesModal])

  const closeModal = useCallback(() => {
    setModal(false)
    setEditing(null)
    reset(EMPTY)
  }, [reset])

  const save = async (data: ProductFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.products.update(editing.id, data as any)
      } else {
        res = await window.api.products.create(data as any)
      }

      if (res && res.ok === false) {
        setPendingData(null)
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            let finalMessage = message as string
            if (field === 'customId' && finalMessage.toLowerCase().includes('uso')) {
              finalMessage = `${finalMessage}. Sugestão: ${findNextAvailableId()}`
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

      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setPendingData(null)
      closeModal()
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message, 'error')
    }
  }

  const onSubmit = (data: ProductFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: ProductFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.products.delete(deleteTarget.id)
    show('Produto excluído')
    setDeleteTarget(null)
    load()
  }

  function edit(row: Product) {
    setEditing(row)
    reset({
      name: row.name,
      customId: row.customId ?? undefined,
      unit_value: row.unit_value ?? null,
    })
    setModal(true)
  }

  const handleEscape = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      closeModal()
    }
  }

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false)
    closeModal()
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão de Inventário"
        title="Catálogo de Produtos"
        actionLabel="Novo Produto"
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedSearch(search)
                }
              }}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
          >
            Filtrar
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 mb-10">
        {[{ label: 'Total de Produtos', value: rows.length, icon: 'inventory_2' }].map(
          ({ label, value, icon }) => (
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
          ),
        )}
      </div>

      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['ID', 'Nome do Produto', 'Valor Unitário', ''].map((h) => (
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
                  Nenhum produto encontrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
              >
                <td className="px-8 py-5 font-mono text-sm text-on-surface-variant">
                  {row.customId || '—'}
                </td>
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
                <td className="px-8 py-5 text-sm text-on-surface-variant">
                  {row.unit_value ? formatBRL(row.unit_value) : '—'}
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setPricesModal(row)}
                      className="p-2 text-outline hover:text-tertiary hover:bg-tertiary/10 rounded-lg transition-all"
                      title="Ver Preços"
                    >
                      <span className="material-symbols-outlined text-xl">price_check</span>
                    </button>
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
            ))}
          </tbody>
        </table>

        <div className="px-8 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} produto{rows.length !== 1 ? 's' : ''} cadastrado
          </p>
        </div>
      </div>

      {pricesModal && (
        <Modal title={`Preços - ${pricesModal.name}`} onClose={() => setPricesModal(null)}>
          <Table
            data={productPrices}
            columns={[
              {
                key: 'customerCustomId',
                label: 'ID',
                render: (row) => (
                  <span className="font-mono text-xs text-on-surface-variant">
                    {row.customerCustomId || '—'}
                  </span>
                ),
              },
              { key: 'customerName', label: 'Cliente' },
              {
                key: 'price',
                label: 'Preço',
                render: (row) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    row.price,
                  ),
              },
            ]}
          />
          <div className="flex justify-end mt-6">
            <Button onClick={() => setPricesModal(null)}>Fechar</Button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title={editing ? 'Editar Produto' : 'Novo Produto'}
          onClose={closeModal}
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
                  label="Nome do produto"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.name?.message}
                  onKeyDown={(e) => e.key === 'Enter' && unitValueRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="unit_value"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  ref={unitValueRef}
                  label="Valor Unitário (R$/ton)"
                  optional
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === 0 ? null : v)}
                  error={errors.unit_value?.message}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(onEnterSubmit as any)()}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit as any)}>Salvar</Button>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este produto?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este produto?"
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
