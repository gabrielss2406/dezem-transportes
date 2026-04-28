import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Modal, Input, Select, Toast, useToast, Badge } from '../components/ui'
import { formatBRL, formatDate, CATEGORIAS_CUSTO, currentMonthKey } from '../lib/utils'
import type { Custo, Caminhao, Fornecedor, Motorista } from '../lib/types'

const EMPTY = { data: '', categoria: '', valor: '', caminhao_id: '', fornecedor_id: '', motorista_id: '', descricao: '' }

const categoriaCor: Record<string, 'blue' | 'amber' | 'red' | 'green' | 'gray'> = {
  combustivel: 'blue', oleo: 'amber', manutencao: 'red', salario: 'green', pedagio: 'gray', outros: 'gray'
}

export function CustosPage() {
  const [custos, setCustos] = useState<Custo[]>([])
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [c, cam, f, m] = await Promise.all([
      window.api.custos.listar(),
      window.api.caminhoes.listar(),
      window.api.fornecedores.listar(),
      window.api.motoristas.listar()
    ])
    setCustos(c); setCaminhoes(cam); setFornecedores(f); setMotoristas(m)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function salvar() {
    try {
      await window.api.custos.criar({
        ...form,
        valor: Number(form.valor),
        caminhao_id: form.caminhao_id ? Number(form.caminhao_id) : null,
        fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null,
        motorista_id: form.motorista_id ? Number(form.motorista_id) : null
      })
      show('Custo lançado!')
      setModal(false); setForm({ ...EMPTY }); load()
    } catch (e: any) { show(e.message || 'Erro', 'error') }
  }

  async function deletar(row: Custo) {
    if (!confirm('Excluir este custo?')) return
    await window.api.custos.deletar(row.id)
    show('Custo excluído')
    load()
  }

  async function lancarSalarios() {
    const mes = currentMonthKey()
    const r = await window.api.custos.lancarSalariosMes(mes)
    show(r.lancados > 0 ? `${r.lancados} salário(s) lançado(s)!` : 'Salários já lançados neste mês')
    load()
  }

  const total = custos.reduce((s, c) => s + c.valor, 0)

  return (
    <div className="p-8 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2a1f14]">Custos</h1>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={lancarSalarios}>💰 Lançar Salários do Mês</Button>
          <Button onClick={() => { setForm({ ...EMPTY }); setModal(true) }}>+ Novo Custo</Button>
        </div>
      </div>

      <div className="bg-[#7B5B2E] text-white rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">TOTAL DE CUSTOS</span>
        <span className="text-2xl font-bold">{formatBRL(total)}</span>
      </div>

      <Table
        columns={[
          { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
          { key: 'categoria', label: 'Categoria', render: (r) => {
            const cat = CATEGORIAS_CUSTO.find(c => c.value === r.categoria)
            return <Badge label={cat?.label || r.categoria} color={categoriaCor[r.categoria] || 'gray'} />
          }},
          { key: 'caminhao_placa', label: 'Caminhão' },
          { key: 'fornecedor_nome', label: 'Fornecedor' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'valor', label: 'Valor', render: (r) => formatBRL(r.valor) }
        ]}
        data={custos}
        onDelete={deletar}
      />

      {modal && (
        <Modal title="Novo Custo" onClose={() => setModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
            <Select label="Categoria" value={form.categoria} onChange={(e) => set('categoria', e.target.value)} options={CATEGORIAS_CUSTO} />
            <Input label="Valor (R$)" type="number" value={form.valor} onChange={(e) => set('valor', e.target.value)} />
            <Select label="Caminhão" optional value={form.caminhao_id} onChange={(e) => set('caminhao_id', e.target.value)}
              options={caminhoes.map((c) => ({ value: c.id, label: c.placa }))} />
            <Select label="Fornecedor" optional value={form.fornecedor_id} onChange={(e) => set('fornecedor_id', e.target.value)}
              options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} />
            <Select label="Motorista" optional value={form.motorista_id} onChange={(e) => set('motorista_id', e.target.value)}
              options={motoristas.map((m) => ({ value: m.id, label: m.nome }))} />
            <div className="col-span-2">
              <Input label="Descrição" optional value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar Custo</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
