import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { customerPriceSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import {
  Button,
  CurrencyInput,
  Modal,
  Select,
  type SelectRef,
  Table,
  Toast,
  useToast,
} from '../components/ui'
import type { Customer, CustomerPrice, Product } from '../lib/types'

const EMPTY = { customerId: 0, productId: 0, price: 0 }

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
    // Foca o botão de confirmar automaticamente para o usuário poder apertar Enter
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

export function PriceManagementPage() {
  const [rows, setRows] = useState<CustomerPrice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filterCustomer, setFilterCustomer] = useState<string | number>('')
  const [filterProduct, setFilterProduct] = useState<string | number>('')
  const [modal, setModal] = useState(false)
  const [editingRow, setEditingRow] = useState<CustomerPrice | null>(null)
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerPrice | null>(null)
  const { toast, show } = useToast()

  const customerSelectRef = useRef<SelectRef>(null)
  const productSelectRef = useRef<SelectRef>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    resolver: zodResolver(customerPriceSchema),
    defaultValues: { ...EMPTY },
  })

  const load = useCallback(async () => {
    const [pricesData, customersData, productsData] = await Promise.all([
      window.api.customerPrices.listAll(),
      window.api.customers.list(),
      window.api.products.list(),
    ])
    setRows(pricesData)
    setCustomers(customersData)
    setProducts(productsData)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (modal) {
      if (editingRow) {
        reset({
          customerId: editingRow.customerId,
          productId: editingRow.productId,
          price: editingRow.price,
        })
        setTimeout(() => {
          priceInputRef.current?.focus()
          priceInputRef.current?.select()
        }, 200)
      } else {
        setTimeout(() => {
          window.focus()
          customerSelectRef.current?.open()
        }, 200)
      }
    } else {
      reset(EMPTY)
      setEditingRow(null)
    }
  }, [modal, reset, editingRow])

  const filteredRows = rows.filter((row) => {
    const matchCustomer = filterCustomer ? row.customerId === Number(filterCustomer) : true
    const matchProduct = filterProduct ? row.productId === Number(filterProduct) : true
    return matchCustomer && matchProduct
  })

  const save = async (data: any) => {
    try {
      await window.api.customerPrices.set(data)
      show(editingRow ? 'Preço atualizado!' : 'Preço definido com sucesso!')
      setModal(false)
      setEditingRow(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message, 'error')
    }
  }

  // Chamado pelo handleSubmit — botão salvar salva direto
  const onSubmit = (data: any) => {
    save(data)
  }

  // Chamado via Enter — pede confirmação
  const onEnterSubmit = (data: any) => {
    setPendingData(data)
  }

  // Chamado ao confirmar no modal próprio
  const handleConfirmSave = async () => {
    if (pendingData) {
      await save(pendingData)
      setPendingData(null)
    }
  }

  const handleCancelSave = () => {
    setPendingData(null)
    // Devolve foco ao input de preço
    setTimeout(() => priceInputRef.current?.focus(), 50)
  }

  const handleEdit = (row: CustomerPrice) => {
    setEditingRow(row)
    setModal(true)
  }

  const handleDelete = (row: CustomerPrice) => {
    setDeleteTarget(row)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.customerPrices.delete(deleteTarget.customerId, deleteTarget.productId)
    show('Preço removido')
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Confirm modal — salvar */}
      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este preço personalizado?"
          onConfirm={handleConfirmSave}
          onCancel={handleCancelSave}
        />
      )}

      {/* Confirm modal — excluir */}
      {deleteTarget && (
        <ConfirmModal
          message="Excluir este preço personalizado?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <PageHeader
        pretitle="Comercial"
        title="Tabela de Preços"
        subtitle="Gerencie preços específicos de produtos para cada cliente."
        actionLabel="Definir Novo Preço"
        onAction={() => setModal(true)}
      />

      {/* Filters */}
      <div className="bg-surface-container-low p-4 rounded-xl mb-10 border border-outline-variant/10 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-64">
            <Select
              label="Filtrar por Cliente"
              value={filterCustomer}
              onChange={setFilterCustomer}
              options={customers.map((c) => ({
                value: c.id,
                label: (
                  <div className="flex justify-between">
                    <span>{c.name}</span>
                    {c.customId && (
                      <span className="text-on-surface-variant/50">#{c.customId}</span>
                    )}
                  </div>
                ),
                displayLabel: c.name,
                searchableLabel: `${c.name} ${c.customId || ''}`,
              }))}
              optional
            />
          </div>
          <div className="w-64">
            <Select
              label="Filtrar por Produto"
              value={filterProduct}
              onChange={setFilterProduct}
              options={products.map((p) => ({
                value: p.id,
                label: (
                  <div className="flex justify-between">
                    <span>{p.name}</span>
                    {p.customId && (
                      <span className="text-on-surface-variant/50">#{p.customId}</span>
                    )}
                  </div>
                ),
                displayLabel: p.name,
                searchableLabel: `${p.name} ${p.customId || ''}`,
              }))}
              optional
            />
          </div>
          {(filterCustomer || filterProduct) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCustomer('')
                setFilterProduct('')
              }}
              className="mb-1"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <Table
        data={filteredRows}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={[
          { key: 'customerName', label: 'Cliente' },
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

      {modal && (
        <Modal
          title={editingRow ? 'Editar Preço' : 'Definir Preço Personalizado'}
          onClose={() => setModal(false)}
        >
          <div className="flex flex-col gap-4">
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select
                  ref={customerSelectRef}
                  label="Cliente"
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => {
                    setTimeout(() => productSelectRef.current?.open(), 10)
                  }}
                  error={errors.customerId?.message}
                  className={editingRow ? 'opacity-60 pointer-events-none' : ''}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{c.name}</span>
                        {c.customId && (
                          <span className="text-on-surface-variant/50">#{c.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: c.name,
                    searchableLabel: `${c.name} ${c.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select
                  ref={productSelectRef}
                  label="Produto"
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => {
                    setTimeout(() => priceInputRef.current?.focus(), 10)
                  }}
                  error={errors.productId?.message}
                  className={editingRow ? 'opacity-60 pointer-events-none' : ''}
                  options={products.map((p) => ({
                    value: p.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{p.name}</span>
                        {p.customId && (
                          <span className="text-on-surface-variant/50">#{p.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: p.name,
                    searchableLabel: `${p.name} ${p.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  ref={priceInputRef}
                  label="Preço"
                  value={field.value}
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(onEnterSubmit)()
                    }
                  }}
                  error={errors.price?.message}
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
          message="Tem certeza que deseja cadastrar este preço personalizado?"
          onConfirm={handleConfirmSave}
          onCancel={handleCancelSave}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este preço personalizado?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
