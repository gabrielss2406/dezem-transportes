import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast } from '../components/ui'
import { formatBRL, formatDate } from '../lib/utils'
import type { Viagem, Caminhao, Motorista, Produto, Cliente, Rota, Fornecedor } from '../lib/types'

const EMPTY = { data: '', caminhao_id: '', motorista_id: '', produto_id: '', cliente_id: '', rota_id: '', fornecedor_id: '', peso_ton: '', preco_cobrado: '', km_percorrido: '', observacao: '' }

export function ViagensPage() {
  const [viagens, setViagens] = useState<Viagem[]>([])
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [v, c, m, p, cl, r, f] = await Promise.all([
      window.api.viagens.listar(),
      window.api.caminhoes.listar(),
      window.api.motoristas.listar(),
      window.api.produtos.listar(),
      window.api.clientes.listar(),
      window.api.rotas.listar(),
      window.api.fornecedores.listar()
    ])
    setViagens(v); setCaminhoes(c); setMotoristas(m); setProdutos(p)
    setClientes(cl); setRotas(r); setFornecedores(f)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    try {
      await window.api.viagens.criar({
        ...form,
        caminhao_id: Number(form.caminhao_id),
        motorista_id: Number(form.motorista_id),
        produto_id: Number(form.produto_id),
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        rota_id: form.rota_id ? Number(form.rota_id) : null,
        fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null,
        peso_ton: Number(form.peso_ton),
        preco_cobrado: Number(form.preco_cobrado),
        km_percorrido: Number(form.km_percorrido)
      })
      show('Viagem registrada!')
      setModal(false)
      setForm({ ...EMPTY })
      load()
    } catch (e: any) {
      show(e.message || 'Erro ao salvar', 'error')
    }
  }

  async function deletar(row: Viagem) {
    if (!confirm('Excluir esta viagem?')) return
    await window.api.viagens.deletar(row.id)
    show('Viagem excluída', 'success')
    load()
  }

  const totalReceita = viagens.reduce((s, v) => s + v.preco_cobrado, 0)
  const totalKm = viagens.reduce((s, v) => s + v.km_percorrido, 0)
  const totalTon = viagens.reduce((s, v) => s + v.peso_ton, 0)

  return (
    <div className="p-8 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Viagens</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setModal(true) }}>+ Nova Viagem</Button>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Receita total</p>
          <p className="text-xl font-bold text-[#7B5B2E]">{formatBRL(totalReceita)}</p>
        </div>
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Km total</p>
          <p className="text-xl font-bold text-[#2a1f14]">{totalKm.toFixed(0)} km</p>
        </div>
        <div className="bg-white border border-[#e8dfd4] rounded-xl p-4">
          <p className="text-xs text-[#9e8c75] uppercase tracking-wide">Tonelagem total</p>
          <p className="text-xl font-bold text-[#2a1f14]">{totalTon.toFixed(1)} ton</p>
        </div>
      </div>

      <Table
        columns={[
          { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
          { key: 'caminhao_placa', label: 'Caminhão' },
          { key: 'motorista_nome', label: 'Motorista' },
          { key: 'produto_nome', label: 'Produto' },
          { key: 'peso_ton', label: 'Peso (ton)', render: (r) => `${r.peso_ton} ton` },
          { key: 'km_percorrido', label: 'Km', render: (r) => `${r.km_percorrido} km` },
          { key: 'preco_cobrado', label: 'Valor', render: (r) => formatBRL(r.preco_cobrado) },
          { key: 'cliente_nome', label: 'Cliente' }
        ]}
        data={viagens}
        onDelete={deletar}
      />

      {modal && (
        <Modal title="Nova Viagem" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
            <Select label="Caminhão" value={form.caminhao_id} onChange={(e) => set('caminhao_id', e.target.value)}
              options={caminhoes.map((c) => ({ value: c.id, label: `${c.placa} — ${c.modelo}` }))} />
            <Select label="Motorista" value={form.motorista_id} onChange={(e) => set('motorista_id', e.target.value)}
              options={motoristas.map((m) => ({ value: m.id, label: m.nome }))} />
            <Select label="Produto" value={form.produto_id} onChange={(e) => set('produto_id', e.target.value)}
              options={produtos.map((p) => ({ value: p.id, label: p.nome }))} />
            <Input label="Peso (ton)" type="number" value={form.peso_ton} onChange={(e) => set('peso_ton', e.target.value)} />
            <Input label="Preço cobrado (R$)" type="number" value={form.preco_cobrado} onChange={(e) => set('preco_cobrado', e.target.value)} />
            <Input label="Km percorrido" type="number" value={form.km_percorrido} onChange={(e) => set('km_percorrido', e.target.value)} />
            <Select label="Cliente" optional value={form.cliente_id} onChange={(e) => set('cliente_id', e.target.value)}
              options={clientes.map((c) => ({ value: c.id, label: c.nome }))} />
            <Select label="Rota" optional value={form.rota_id} onChange={(e) => set('rota_id', e.target.value)}
              options={rotas.map((r) => ({ value: r.id, label: r.nome }))} />
            <Select label="Posto (fornecedor)" optional value={form.fornecedor_id} onChange={(e) => set('fornecedor_id', e.target.value)}
              options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} />
            <div className="col-span-2">
              <Input label="Observação" optional value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar Viagem</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
