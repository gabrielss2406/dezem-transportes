import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { customerSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Customer } from '../../lib/types'

const EMPTY: Omit<Customer, 'id'> = { name: '', cnpj: '', ie: '', phone: '', address: '' }

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    watch,
  } = useForm<Omit<Customer, 'id'>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(99) 99999-9999'
      : '(99) 9999-9999'

  const load = useCallback(() => window.api.customers.list(search).then(setRows), [search])
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

  const onSubmit = async (data: Omit<Customer, 'id'>) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.customers.update(editing.id, data)
      } else {
        res = await window.api.customers.create(data)
      }

      if (res && res.ok === false) {
        const msg = res.errors ? Object.values(res.errors)[0] : 'Erro ao salvar dados'
        show(String(msg), 'error')
        return
      }

      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
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
    reset({
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
      <PageHeader
        pretitle="Gestão Operacional"
        title="Clientes"
        subtitle="Gerencie sua base de parceiros comerciais."
        actionLabel="Novo Cliente"
        onAction={() => setModal(true)}
      >
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
      </PageHeader>

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
              <Input label="Nome" {...register('name')} error={errors.name?.message} />
            </div>
            <Input
              label="CNPJ"
              optional
              mask="99.999.999/9999-99"
              maskChar=""
              {...register('cnpj')}
              error={errors.cnpj?.message}
            />
            <Input
              label="Inscrição Estadual"
              optional
              {...register('ie')}
              error={errors.ie?.message}
            />
            <Input
              label="Telefone"
              optional
              mask={phoneMask}
              maskChar={null}
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Input
              label="Endereço"
              optional
              {...register('address')}
              error={errors.address?.message}
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
