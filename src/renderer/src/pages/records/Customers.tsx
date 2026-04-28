import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Table, Toast, useToast } from '../../components/ui'
import type { Customer } from '../../lib/types'

const EMPTY_CUSTOMER = { name: '', cnpj: '', ie: '', phone: '', address: '' }

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_CUSTOMER })
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.customers.list(search).then(setRows), [search])
  useEffect(() => {
    load()
  }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.customers.update(editing.id, form)
      else await window.api.customers.create(form)
      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ ...EMPTY_CUSTOMER })
      load()
    } catch (e: any) {
      show(e.message, 'error')
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
    setForm({
      name: row.name,
      cnpj: row.cnpj ?? '',
      ie: row.ie ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
    })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="Clientes"
        actionLabel="Novo Cliente"
        onAction={() => {
          setEditing(null)
          setForm({ ...EMPTY_CUSTOMER })
          setModal(true)
        }}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'cnpj', label: 'CNPJ' },
          { key: 'ie', label: 'Inscrição Estadual' },
          { key: 'phone', label: 'Telefone' },
        ]}
        data={rows}
        onEdit={edit}
        onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <Input
              label="CNPJ"
              optional
              value={form.cnpj}
              onChange={(e) => set('cnpj', e.target.value)}
            />
            <Input
              label="Inscrição Estadual"
              optional
              value={form.ie}
              onChange={(e) => set('ie', e.target.value)}
            />
            <Input
              label="Telefone"
              optional
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label="Endereço"
              optional
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
