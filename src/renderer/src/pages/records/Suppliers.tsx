import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { SUPPLIER_TYPES } from '../../lib/utils'
import type { Supplier } from '../../lib/types'

const EMPTY_SUPPLIER = { name: '', type: 'gas_station', phone: '' }

export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_SUPPLIER })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.suppliers.list().then(setRows), [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    try {
      if (editing) await window.api.suppliers.update(editing.id, form)
      else await window.api.suppliers.create(form)
      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_SUPPLIER }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function handleDelete(row: Supplier) {
    if (!confirm('Excluir este fornecedor?')) return
    await window.api.suppliers.delete(row.id)
    show('Fornecedor excluído'); load()
  }

  function edit(row: Supplier) {
    setEditing(row); setForm({ name: row.name, type: row.type, phone: row.phone ?? '' }); setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <PageHeader 
        title="Fornecedores" 
        actionLabel="Novo Fornecedor" 
        onAction={() => { setEditing(null); setForm({ ...EMPTY_SUPPLIER }); setModal(true) }} 
      />

      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'type', label: 'Tipo', render: (r) => SUPPLIER_TYPES.find(t => t.value === r.type)?.label ?? r.type },
          { key: 'phone', label: 'Telefone' }
        ]}
        data={rows} onEdit={edit} onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Select label="Tipo" value={form.type} onChange={(e) => set('type', e.target.value)} options={SUPPLIER_TYPES} />
            <Input label="Telefone" optional value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
