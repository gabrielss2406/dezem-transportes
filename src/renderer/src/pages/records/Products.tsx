import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Select, Table, Toast, useToast } from '../../components/ui'
import type { Product } from '../../lib/types'

export function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'ton' })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.products.list().then(setRows), [])
  useEffect(() => {
    load()
  }, [load])

  async function save() {
    try {
      if (editing) await window.api.products.update(editing.id, form)
      else await window.api.products.create(form)
      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setModal(false)
      setEditing(null)
      setForm({ name: '', unit: 'ton' })
      load()
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  async function handleDelete(row: Product) {
    if (!confirm('Excluir este produto?')) return
    await window.api.products.delete(row.id)
    show('Produto excluído')
    load()
  }

  function edit(row: Product) {
    setEditing(row)
    setForm({ name: row.name, unit: row.unit })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="Produtos"
        actionLabel="Novo Produto"
        onAction={() => {
          setEditing(null)
          setForm({ name: '', unit: 'ton' })
          setModal(true)
        }}
      />

      <Table
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'unit', label: 'Unidade' },
        ]}
        data={rows}
        onEdit={edit}
        onDelete={handleDelete}
      />
      {modal && (
        <Modal title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input
              label="Nome do produto"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              label="Unidade"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              options={[
                { value: 'ton', label: 'Tonelada (ton)' },
                { value: 'm3', label: 'Metro cúbico (m³)' },
                { value: 'un', label: 'Unidade' },
              ]}
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
