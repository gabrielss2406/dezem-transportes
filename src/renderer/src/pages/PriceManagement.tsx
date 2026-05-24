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
import { generatePdf } from '../lib/pdfGenerator' // <-- Adicionar esta linha
import type { Customer, CustomerPrice, Product } from '../lib/types'

interface PriceFormData {
  customerId: number
  productId: number
  price: number
}

const EMPTY: PriceFormData = { customerId: 0, productId: 0, price: 0 }

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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const customerSelectRef = useRef<SelectRef>(null)
  const productSelectRef = useRef<SelectRef>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<PriceFormData>({
    resolver: zodResolver(customerPriceSchema) as any,
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

  const handleExportPriceManagementPdf = () => {
    const headers = ['Cliente', 'Produto', 'Preço']

    const data = filteredRows.map((row) => {
      const customer = customers.find((c) => c.id === row.customerId)
      const product = products.find((p) => p.id === row.productId)

      const customerName = customer ? customer.name : 'Desconhecido'
      const productName = product ? product.name : 'Desconhecido'
      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(row.price)

      return [customerName, productName, formattedPrice]
    })

    const date = new Date().toLocaleDateString('pt-BR')
    let subtitle = `Relatório emitido em ${date}.`

    const filterCustomerName = filterCustomer
      ? customers.find((c) => c.id === Number(filterCustomer))?.name
      : ''
    const filterProductName = filterProduct
      ? products.find((p) => p.id === Number(filterProduct))?.name
      : ''

    const fileNameParts = ['tabela-precos-geral']
    if (filterCustomerName) {
      fileNameParts.push(filterCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    }
    if (filterProductName) {
      fileNameParts.push(filterProductName.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    }
    fileNameParts.push(date.replace(/\//g, '-'))
    const dynamicFileName = fileNameParts.join('-')

    if (filterCustomerName && filterProductName) {
      subtitle = `Filtros: Cliente: "${filterCustomerName}", Produto: "${filterProductName}". ${subtitle}`
    } else if (filterCustomerName) {
      subtitle = `Filtro: Cliente: "${filterCustomerName}". ${subtitle}`
    } else if (filterProductName) {
      subtitle = `Filtro: Produto: "${filterProductName}". ${subtitle}`
    }

    generatePdf({
      title: 'Tabela de Preços Geral',
      subtitle,
      headers,
      data,
      fileName: dynamicFileName,
    })
  }

  const save = async (data: PriceFormData) => {
    try {
      await window.api.customerPrices.set(data)
      show(editingRow ? 'Preço atualizado!' : 'Preço definido com sucesso!')
      setModal(false)
      setEditingRow(null)
      load()
    } catch (e: any) {
      setPendingData(null) // Fecha o modal de confirmação em caso de erro
      show(e.message, 'error')
    }
  }

  // Chamado pelo handleSubmit — botão salvar salva direto
  const onSubmit = (data: PriceFormData) => {
    save(data)
  }

  // Chamado via Enter — pede confirmação
  const onEnterSubmit = (data: PriceFormData) => {
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
      >
        {/* Adicionar o botão de exportação aqui, perto dos filtros */}
        <Button variant="ghost" onClick={handleExportPriceManagementPdf} className="ml-4 mb-2">
          <span className="material-symbols-outlined text-lg -ml-1 mr-2">picture_as_pdf</span>
          Exportar PDF
        </Button>
      </PageHeader>

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
          onEscape={handleEscape}
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
                      handleSubmit(onEnterSubmit as any)()
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
            <Button onClick={handleSubmit(onSubmit as any)}>Salvar</Button>
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
