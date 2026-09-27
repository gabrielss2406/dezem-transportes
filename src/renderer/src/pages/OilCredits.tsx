import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button, DatePicker, Input, Select, Toast, useToast } from '../components/ui'

type Account = {
  id: number
  customer_id: number
  supplier_id: number
  customer_name: string
  supplier_name: string
  amount: number
  liters: number
  due_date?: string
  expired?: boolean
}
type FormState = {
  customer_id: string
  supplier_id: string
  amount: string
  liters: string
  price_per_liter: string
  movement_date: string
  due_date: string
  description: string
}
const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = (): FormState => ({
  customer_id: '',
  supplier_id: '',
  amount: '',
  liters: '',
  price_per_liter: '',
  movement_date: today(),
  due_date: today(),
  description: '',
})
const brl = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function OilCreditsPage({ embedded = false }: { embedded?: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [editingSettlement, setEditingSettlement] = useState<number | null>(null)
  const [selected, setSelected] = useState<Account | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [settlementForm, setSettlementForm] = useState({
    start_date: today(),
    end_date: today(),
    due_date: today(),
  })
  const [busy, setBusy] = useState(false)
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    const [a, c, s, st] = await Promise.all([
      window.api.oilCredits.listAccounts(),
      window.api.customers.list(),
      window.api.suppliers.list(),
      window.api.oilCredits.listSettlements(),
    ])
    setAccounts(a)
    setCustomers(c)
    setSuppliers(s)
    setSettlements(st)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  const linkedSuppliers = useMemo(
    () =>
      suppliers.filter(
        (supplier) => !form.customer_id || String(supplier.customer_id) === form.customer_id,
      ),
    [suppliers, form.customer_id],
  )
  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const saveCredit = async (adjust = false) => {
    setBusy(true)
    const payload = {
      customer_id: Number(form.customer_id),
      supplier_id: Number(form.supplier_id),
      amount: form.amount ? Number(form.amount) : null,
      liters: form.liters ? Number(form.liters) : null,
      price_per_liter: form.price_per_liter ? Number(form.price_per_liter) : null,
      movement_date: form.movement_date,
      due_date: form.due_date,
      description: form.description || undefined,
    }
    const result = await (adjust
      ? window.api.oilCredits.adjust(payload)
      : window.api.oilCredits.addCredit(payload))
    setBusy(false)
    if (result?.ok === false) {
      show(result.errors?.form || result.errors?.supplier_id || 'Não foi possível salvar.', 'error')
      return
    }
    show(adjust ? 'Ajuste lançado.' : 'Crédito lançado.')
    setForm(emptyForm())
    await load()
  }
  const createSettlement = async () => {
    if (!selected) {
      show('Selecione uma conta de óleo.', 'error')
      return
    }
    setBusy(true)
    const payload = {
      customer_id: selected.customer_id,
      supplier_id: selected.supplier_id,
      ...settlementForm,
      fuel_record_ids: [],
    }
    const result = editingSettlement
      ? await window.api.oilCredits.updateSettlement(editingSettlement, payload)
      : await window.api.oilCredits.createSettlement(payload)
    setBusy(false)
    if (result?.ok === false) {
      show(result.errors?.form || 'Não foi possível fechar.', 'error')
      return
    }
    show(
      editingSettlement
        ? 'Fechamento atualizado.'
        : 'Fechamento salvo e cobrança consolidada criada.',
    )
    setEditingSettlement(null)
    await load()
  }
  const editSettlement = async (id: number) => {
    const data = await window.api.oilCredits.getSettlement(id)
    if (data?.ok === false) {
      show(data.errors?.form || 'Fechamento não encontrado.', 'error')
      return
    }
    const account = accounts.find(
      (item) => item.customer_id === data.customer_id && item.supplier_id === data.supplier_id,
    )
    if (account) {
      setSelected(account)
    }
    setSettlementForm({
      start_date: data.start_date,
      end_date: data.end_date,
      due_date: data.due_date,
    })
    setEditingSettlement(id)
  }
  const exportSettlement = async (id: number) => {
    const data = await window.api.oilCredits.exportData(id)
    if (data?.ok === false) {
      show(data.errors?.form || 'Fechamento não encontrado.', 'error')
      return
    }
    const doc = new jsPDF()
    doc.text(
      `Fechamento de óleo — ${data.settlement.start_date} a ${data.settlement.end_date}`,
      14,
      16,
    )
    doc.text(
      `Fretes: ${brl(data.settlement.gross_freight)} | Óleo: ${brl(data.settlement.oil_debit)} | Líquido: ${brl(data.settlement.net_amount)}`,
      14,
      24,
    )
    autoTable(doc, {
      startY: 32,
      head: [['Vale', 'Litros', 'Preço/L', 'Valor']],
      body: data.items.map((item: any) => [
        item.voucher_number || '—',
        Number(item.liters).toFixed(2),
        brl(item.price_per_liter),
        brl(item.amount),
      ]),
    })
    await window.api.exportPdf({
      fileName: `fechamento-oleo-${id}`,
      data: doc.output('arraybuffer'),
    })
  }

  return (
    <div className={embedded ? 'space-y-6' : 'px-6 py-12 max-w-7xl mx-auto'}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      {!embedded && <PageHeader pretitle="Financeiro" title="Crédito de Óleo" />}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-surface-container rounded-xl p-6 border border-outline-variant/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Contas de crédito</h2>
            <span className="text-xs text-on-surface-variant">Saldo em reais e litros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-on-surface-variant">
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Saldo</th>
                  <th className="p-3">Validade</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => {
                      setSelected(account)
                      setForm((current) => ({
                        ...current,
                        customer_id: String(account.customer_id),
                        supplier_id: String(account.supplier_id),
                      }))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelected(account)
                        setForm((current) => ({
                          ...current,
                          customer_id: String(account.customer_id),
                          supplier_id: String(account.supplier_id),
                        }))
                      }
                    }}
                    tabIndex={0}
                    className={`border-t border-outline-variant/10 cursor-pointer hover:bg-surface-bright/10 ${selected?.id === account.id ? 'bg-primary/10' : ''}`}
                  >
                    <td className="p-3 font-bold">{account.customer_name}</td>
                    <td className="p-3">{account.supplier_name}</td>
                    <td className="p-3">
                      {brl(account.amount)}
                      <span className="block text-xs text-on-surface-variant">
                        {Number(account.liters).toFixed(2)} L
                      </span>
                    </td>
                    <td
                      className={`p-3 text-sm ${account.expired ? 'text-error font-bold' : 'text-on-surface-variant'}`}
                    >
                      {account.due_date || '—'}
                      {account.expired ? ' (vencido)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="bg-surface-container rounded-xl p-6 border border-outline-variant/10">
          <h2 className="text-lg font-bold mb-5">Lançar crédito / ajuste</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Select
                label="Cliente"
                value={form.customer_id}
                onChange={(value) => {
                  update('customer_id', String(value || ''))
                  update('supplier_id', '')
                }}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.name,
                }))}
              />
            </div>
            <div className="col-span-2">
              <Select
                label="Fornecedor vinculado"
                value={form.supplier_id}
                onChange={(value) => update('supplier_id', String(value || ''))}
                options={linkedSuppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
              />
            </div>
            <Input
              label="Valor"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
            <Input
              label="Litros"
              type="number"
              step="0.01"
              value={form.liters}
              onChange={(e) => update('liters', e.target.value)}
            />
            <div className="col-span-2">
              <Input
                label="Preço por litro"
                optional
                type="number"
                step="0.001"
                value={form.price_per_liter}
                onChange={(e) => update('price_per_liter', e.target.value)}
              />
            </div>
            <DatePicker
              label="Data"
              value={form.movement_date}
              onChange={(e) => update('movement_date', e.target.value)}
            />
            <DatePicker
              label="Vencimento"
              value={form.due_date}
              onChange={(e) => update('due_date', e.target.value)}
            />
            <div className="col-span-2">
              <Input
                label="Descrição"
                optional
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button disabled={busy} onClick={() => saveCredit(false)}>
              Adicionar crédito
            </Button>
            <Button disabled={busy} variant="ghost" onClick={() => saveCredit(true)}>
              Ajustar saldo
            </Button>
          </div>
        </section>
      </div>
      <section className="mt-6 bg-surface-container rounded-xl p-6 border border-outline-variant/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Fechamento de cobrança</h2>
            <p className="text-sm text-on-surface-variant">
              Seleciona todos os abastecimentos de crédito ainda não fechados no período.
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <DatePicker
              label="Início"
              value={settlementForm.start_date}
              onChange={(e) => setSettlementForm({ ...settlementForm, start_date: e.target.value })}
            />
            <DatePicker
              label="Fim"
              value={settlementForm.end_date}
              onChange={(e) => setSettlementForm({ ...settlementForm, end_date: e.target.value })}
            />
            <DatePicker
              label="Vencimento"
              value={settlementForm.due_date}
              onChange={(e) => setSettlementForm({ ...settlementForm, due_date: e.target.value })}
            />
            <Button disabled={busy} onClick={createSettlement}>
              {editingSettlement ? 'Atualizar fechamento' : 'Salvar fechamento'}
            </Button>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-on-surface-variant">
                <th className="p-3">Período</th>
                <th className="p-3">Cliente / fornecedor</th>
                <th className="p-3">Fretes</th>
                <th className="p-3">Óleo</th>
                <th className="p-3">Líquido</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="border-t border-outline-variant/10">
                  <td className="p-3">
                    {settlement.start_date} a {settlement.end_date}
                  </td>
                  <td className="p-3">
                    {settlement.customer_name}
                    <span className="block text-xs text-on-surface-variant">
                      {settlement.supplier_name}
                    </span>
                  </td>
                  <td className="p-3">{brl(settlement.gross_freight)}</td>
                  <td className="p-3">{brl(settlement.oil_debit)}</td>
                  <td className="p-3 font-bold text-primary">{brl(settlement.net_amount)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="text-on-surface-variant text-sm font-bold mr-4"
                      onClick={() => editSettlement(settlement.id)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-primary text-sm font-bold"
                      onClick={() => exportSettlement(settlement.id)}
                    >
                      Exportar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
