import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { customerPriceSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import { Button, CurrencyInput, Modal, Select, Table, Toast, useToast } from '../components/ui'
import type { Customer, CustomerPrice, Product } from '../lib/types'

const EMPTY = { customerId: 0, productId: 0, price: 0 }

export function PriceManagementPage() {
  const [rows, setRows] = useState<CustomerPrice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [modal, setModal] = useState(false)
  const { toast, show } = useToast()

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
    if (!modal) {
      reset(EMPTY)
    }
  }, [modal, reset])

  const onSubmit = async (data: any) => {
    try {
      await window.api.customerPrices.set(data)
      show('Preço definido com sucesso!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  const handleDelete = async (row: CustomerPrice) => {
    if (!confirm('Excluir este preço personalizado?')) {
      return
    }
    await window.api.customerPrices.delete(row.customerId, row.productId)
    show('Preço removido')
    load()
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Comercial"
        title="Tabela de Preços"
        subtitle="Gerencie preços específicos de produtos para cada cliente."
        actionLabel="Definir Novo Preço"
        onAction={() => setModal(true)}
      />

      <Table
        data={rows}
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
        <Modal title="Definir Preço Personalizado" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Cliente"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.customerId?.message}
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            />
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Produto"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.productId?.message}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                />
              )}
            />
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Preço"
                  value={field.value}
                  onChange={field.onChange}
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
    </div>
  )
}
