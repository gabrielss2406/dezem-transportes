import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../components/ui'
import { TIPOS_FORNECEDOR } from '../lib/utils'
import type { Caminhao, Motorista, Cliente, Produto, Fornecedor } from '../lib/types'

// ── CAMINHÕES ────────────────────────────────────────────────────────────────
const EMPTY_CAM = { placa: '', modelo: '', ano: '', capacidade_ton: '', odometro_atual: '' }
export function CaminhoesPage() {
  const [rows, setRows] = useState<Caminhao[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Caminhao | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_CAM })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.caminhoes.listar().then(setRows), [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    const data = { ...form, ano: Number(form.ano), capacidade_ton: Number(form.capacidade_ton), odometro_atual: Number(form.odometro_atual) }
    try {
      if (editing) await window.api.caminhoes.editar(editing.id, data)
      else await window.api.caminhoes.criar(data)
      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_CAM }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function deletar(row: Caminhao) {
    if (!confirm('Excluir este caminhão?')) return
    await window.api.caminhoes.deletar(row.id)
    show('Caminhão excluído'); load()
  }

  function edit(row: Caminhao) {
    setEditing(row)
    setForm({ placa: row.placa, modelo: row.modelo, ano: row.ano ?? '', capacidade_ton: row.capacidade_ton ?? '', odometro_atual: row.odometro_atual })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Caminhões</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_CAM }); setModal(true) }}>+ Novo Caminhão</Button>
      </div>
      <Table
        columns={[
          { key: 'placa', label: 'Placa' },
          { key: 'modelo', label: 'Modelo' },
          { key: 'ano', label: 'Ano' },
          { key: 'capacidade_ton', label: 'Capacidade', render: (r) => r.capacidade_ton ? `${r.capacidade_ton} ton` : '—' },
          { key: 'odometro_atual', label: 'Odômetro', render: (r) => `${r.odometro_atual.toFixed(0)} km` }
        ]}
        data={rows} onEdit={edit} onDelete={deletar}
      />
      {modal && (
        <Modal title={editing ? 'Editar Caminhão' : 'Novo Caminhão'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Placa" value={form.placa} onChange={(e) => set('placa', e.target.value)} placeholder="ABC-1234" />
            <Input label="Modelo" value={form.modelo} onChange={(e) => set('modelo', e.target.value)} />
            <Input label="Ano" type="number" value={form.ano} onChange={(e) => set('ano', e.target.value)} />
            <Input label="Capacidade (ton)" type="number" value={form.capacidade_ton} onChange={(e) => set('capacidade_ton', e.target.value)} />
            <Input label="Odômetro inicial (km)" type="number" value={form.odometro_atual} onChange={(e) => set('odometro_atual', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── MOTORISTAS ───────────────────────────────────────────────────────────────
const EMPTY_MOT = { nome: '', cpf: '', telefone: '', salario_mensal: '', caminhao_id: '' }
export function MotoristasPage() {
  const [rows, setRows] = useState<Motorista[]>([])
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Motorista | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_MOT })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [m, c] = await Promise.all([window.api.motoristas.listar(), window.api.caminhoes.listar()])
    setRows(m); setCaminhoes(c)
  }, [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    const data = { ...form, salario_mensal: Number(form.salario_mensal), caminhao_id: form.caminhao_id ? Number(form.caminhao_id) : null }
    try {
      if (editing) await window.api.motoristas.editar(editing.id, data)
      else await window.api.motoristas.criar(data)
      show(editing ? 'Motorista atualizado!' : 'Motorista cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_MOT }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function deletar(row: Motorista) {
    if (!confirm('Excluir este motorista?')) return
    await window.api.motoristas.deletar(row.id)
    show('Motorista excluído'); load()
  }

  function edit(row: Motorista) {
    setEditing(row)
    setForm({ nome: row.nome, cpf: row.cpf ?? '', telefone: row.telefone ?? '', salario_mensal: row.salario_mensal, caminhao_id: row.caminhao_id ?? '' })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Motoristas</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_MOT }); setModal(true) }}>+ Novo Motorista</Button>
      </div>
      <Table
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'cpf', label: 'CPF' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'salario_mensal', label: 'Salário', render: (r) => `R$ ${r.salario_mensal.toFixed(2)}` },
          { key: 'caminhao_placa', label: 'Caminhão' }
        ]}
        data={rows} onEdit={edit} onDelete={deletar}
      />
      {modal && (
        <Modal title={editing ? 'Editar Motorista' : 'Novo Motorista'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            <Input label="CPF" optional value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
            <Input label="Telefone" optional value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
            <Input label="Salário mensal (R$)" type="number" value={form.salario_mensal} onChange={(e) => set('salario_mensal', e.target.value)} />
            <Select label="Caminhão vinculado" optional value={form.caminhao_id} onChange={(e) => set('caminhao_id', e.target.value)}
              options={caminhoes.map((c) => ({ value: c.id, label: c.placa }))} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── CLIENTES ─────────────────────────────────────────────────────────────────
const EMPTY_CLI = { nome: '', cnpj: '', ie: '', telefone: '', endereco: '' }
export function ClientesPage() {
  const [rows, setRows] = useState<Cliente[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_CLI })
  const [busca, setBusca] = useState('')
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.clientes.listar(busca).then(setRows), [busca])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    try {
      if (editing) await window.api.clientes.editar(editing.id, form)
      else await window.api.clientes.criar(form)
      show(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_CLI }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function deletar(row: Cliente) {
    if (!confirm('Excluir este cliente?')) return
    await window.api.clientes.deletar(row.id)
    show('Cliente excluído'); load()
  }

  function edit(row: Cliente) {
    setEditing(row)
    setForm({ nome: row.nome, cnpj: row.cnpj ?? '', ie: row.ie ?? '', telefone: row.telefone ?? '', endereco: row.endereco ?? '' })
    setModal(true)
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Clientes</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_CLI }); setModal(true) }}>+ Novo Cliente</Button>
      </div>
      <div className="mb-4">
        <Input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <Table
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'cnpj', label: 'CNPJ' },
          { key: 'ie', label: 'Inscrição Estadual' },
          { key: 'telefone', label: 'Telefone' }
        ]}
        data={rows} onEdit={edit} onDelete={deletar}
      />
      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} /></div>
            <Input label="CNPJ" optional value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            <Input label="Inscrição Estadual" optional value={form.ie} onChange={(e) => set('ie', e.target.value)} />
            <Input label="Telefone" optional value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
            <Input label="Endereço" optional value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── PRODUTOS ─────────────────────────────────────────────────────────────────
export function ProdutosPage() {
  const [rows, setRows] = useState<Produto[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [form, setForm] = useState({ nome: '', unidade: 'ton' })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.produtos.listar().then(setRows), [])
  useEffect(() => { load() }, [load])

  async function salvar() {
    try {
      if (editing) await window.api.produtos.editar(editing.id, form)
      else await window.api.produtos.criar(form)
      show(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
      setModal(false); setEditing(null); setForm({ nome: '', unidade: 'ton' }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function deletar(row: Produto) {
    if (!confirm('Excluir este produto?')) return
    await window.api.produtos.deletar(row.id)
    show('Produto excluído'); load()
  }

  function edit(row: Produto) {
    setEditing(row); setForm({ nome: row.nome, unidade: row.unidade }); setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Produtos</h1>
        <Button onClick={() => { setEditing(null); setForm({ nome: '', unidade: 'ton' }); setModal(true) }}>+ Novo Produto</Button>
      </div>
      <Table
        columns={[{ key: 'nome', label: 'Nome' }, { key: 'unidade', label: 'Unidade' }]}
        data={rows} onEdit={edit} onDelete={deletar}
      />
      {modal && (
        <Modal title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome do produto" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            <Select label="Unidade" value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
              options={[{ value: 'ton', label: 'Tonelada (ton)' }, { value: 'm3', label: 'Metro cúbico (m³)' }, { value: 'un', label: 'Unidade' }]} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── FORNECEDORES ─────────────────────────────────────────────────────────────
const EMPTY_FOR = { nome: '', tipo: 'posto', telefone: '' }
export function FornecedoresPage() {
  const [rows, setRows] = useState<Fornecedor[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Fornecedor | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_FOR })
  const { toast, show } = useToast()

  const load = useCallback(() => window.api.fornecedores.listar().then(setRows), [])
  useEffect(() => { load() }, [load])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    try {
      if (editing) await window.api.fornecedores.editar(editing.id, form)
      else await window.api.fornecedores.criar(form)
      show(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
      setModal(false); setEditing(null); setForm({ ...EMPTY_FOR }); load()
    } catch (e: any) { show(e.message, 'error') }
  }

  async function deletar(row: Fornecedor) {
    if (!confirm('Excluir este fornecedor?')) return
    await window.api.fornecedores.deletar(row.id)
    show('Fornecedor excluído'); load()
  }

  function edit(row: Fornecedor) {
    setEditing(row); setForm({ nome: row.nome, tipo: row.tipo, telefone: row.telefone ?? '' }); setModal(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Fornecedores</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY_FOR }); setModal(true) }}>+ Novo Fornecedor</Button>
      </div>
      <Table
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'tipo', label: 'Tipo', render: (r) => TIPOS_FORNECEDOR.find(t => t.value === r.tipo)?.label ?? r.tipo },
          { key: 'telefone', label: 'Telefone' }
        ]}
        data={rows} onEdit={edit} onDelete={deletar}
      />
      {modal && (
        <Modal title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            <Select label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value)} options={TIPOS_FORNECEDOR} />
            <Input label="Telefone" optional value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
