import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { customerSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Table, Toast, useToast } from '../../components/ui'
import { generatePdf } from '../../lib/pdfGenerator'
import type { Customer } from '../../lib/types'

interface CustomerFormData {
  name: string
  cnpj?: string
  ie?: string
  phone?: string
  address?: string
  customId?: number
}

const EMPTY_VALUES: CustomerFormData = {
  name: '',
  cnpj: '',
  ie: '',
  phone: '',
  address: '',
  customId: undefined,
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

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [pricesModal, setPricesModal] = useState<Customer | null>(null)
  const [customerPrices, setCustomerPrices] = useState<any[]>([])
  const [editing, setEditing] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const nameRef = useRef<HTMLInputElement>(null)
  const cnpjRef = useRef<HTMLInputElement>(null)
  const ieRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const customIdRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    control,
    setValue,
    setError,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: EMPTY_VALUES,
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(00) 00000-0000'
      : '(00) 0000-0000'

  const load = useCallback(
    () => window.api.customers.list(appliedSearch).then(setRows),
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
          nameRef.current?.focus()
          nameRef.current?.select()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY_VALUES)
    }
  }, [modal, editing, reset, setValue, findNextAvailableId])

  useEffect(() => {
    if (pricesModal) {
      window.api.customerPrices.listByCustomer(pricesModal.id).then(setCustomerPrices)
    } else {
      setCustomerPrices([])
    }
  }, [pricesModal])

  const handleExportPricesPdf = async () => {
    if (!pricesModal) {
      return
    }

    const headers = ['ID do Produto', 'Produto', 'Preço']
    const data = customerPrices.map((price) => [
      price.productCustomId || '—',
      price.productName,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price.price),
    ])

    const date = new Date().toLocaleDateString('pt-BR')
    const fileNameSafeName = pricesModal.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const dynamicFileName = `tabela-precos-${fileNameSafeName}-${date.replace(/\//g, '-')}`

    const pdfData = generatePdf({
      title: `Tabela de Preços - ${pricesModal.name}`,
      subtitle: `Preços especiais válidos para ${date}.`,
      headers,
      data,
    })

    try {
      const result = await window.api.exportPdf({
        fileName: dynamicFileName,
        data: pdfData,
      })

      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  const save = async (data: CustomerFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.customers.update(editing.id, data as any)
      } else {
        res = await window.api.customers.create(data as any)
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

      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false)
      setPendingData(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  const onSubmit = (data: CustomerFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: CustomerFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.customers.delete(deleteTarget.id)
    show('Cliente excluído')
    setDeleteTarget(null)
    load()
  }

  function edit(row: Customer) {
    setEditing(row)
    reset({
      name: row.name,
      cnpj: row.cnpj ?? '',
      ie: row.ie ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      customId: row.customId ?? undefined,
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

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão Operacional"
        title="Clientes"
        subtitle="Gerencie sua base de parceiros comerciais."
        actionLabel="Novo Cliente"
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

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['ID', 'Nome', 'CNPJ', 'Inscrição Estadual', 'Telefone', ''].map((h) => (
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
                <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-primary/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}
              >
                <td className="px-8 py-5 font-mono text-sm text-on-surface-variant">
                  {row.customId || '—'}
                </td>
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

        {/* Footer */}
        <div className="px-8 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} cliente{rows.length !== 1 ? 's' : ''} encontrado
          </p>
        </div>
      </div>

      {pricesModal && (
        <Modal title={`Preços - ${pricesModal.name}`} onClose={() => setPricesModal(null)}>
          <Table
            data={customerPrices}
            columns={[
              {
                key: 'productCustomId',
                label: 'ID',
                render: (row) => (
                  <span className="font-mono text-xs text-on-surface-variant">
                    {row.productCustomId || '—'}
                  </span>
                ),
              },
              { key: 'productName', label: 'Produto' },
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
          <div className="flex justify-end items-center gap-3 mt-6">
            <Button variant="ghost" onClick={handleExportPricesPdf}>
              <span className="material-symbols-outlined text-lg -ml-1 mr-2">picture_as_pdf</span>
              Exportar
            </Button>
            <Button onClick={() => setPricesModal(null)}>Fechar</Button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title={editing ? 'Editar Cliente' : 'Novo Cliente'}
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
            </div>
            <div className="col-span-2">
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
                    onKeyDown={(e) => e.key === 'Enter' && cnpjRef.current?.focus()}
                  />
                )}
              />
            </div>
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <Input
                  ref={cnpjRef}
                  label="CNPJ"
                  optional
                  mask="00.000.000/0000-00"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.cnpj?.message}
                  onKeyDown={(e) => e.key === 'Enter' && ieRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="ie"
              control={control}
              render={({ field }) => (
                <Input
                  ref={ieRef}
                  label="Inscrição Estadual"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.ie?.message}
                  onKeyDown={(e) => e.key === 'Enter' && phoneRef.current?.focus()}
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
                  onKeyDown={(e) => e.key === 'Enter' && addressRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Input
                  ref={addressRef}
                  label="Endereço"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.address?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(onEnterSubmit as any)()
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
            <Button onClick={handleSubmit(onSubmit as any)}>Salvar</Button>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este cliente?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este cliente?"
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
