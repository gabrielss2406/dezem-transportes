import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button, DatePicker, KpiCard, Modal, Select, Toast, useToast } from '../components/ui'
import type { Customer, Receivable } from '../lib/types'
import { formatBRL, formatDate, today } from '../lib/utils'

export function ReceivablesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filters, setFilters] = useState<{ customer_id: string; status: string }>({
    customer_id: '',
    status: 'open',
  })
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [openTotals, setOpenTotals] = useState({ amount: 0, count: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [markPaidModal, setMarkPaidModal] = useState(false)
  const [paidDate, setPaidDate] = useState(today())
  const { toast, show } = useToast()

  const loadCustomers = useCallback(async () => {
    setCustomers(await window.api.customers.list())
  }, [])

  const loadReceivables = useCallback(async () => {
    const r = await window.api.receivables.list({
      customer_id: filters.customer_id || undefined,
      status: filters.status || undefined,
    })
    setReceivables(r)
    setSelectedIds(new Set())
  }, [filters])

  const loadOpenTotals = useCallback(async () => {
    const open = await window.api.receivables.list({ status: 'open' })
    setOpenTotals({
      amount: open.reduce((s, r) => s + r.amount, 0),
      count: open.length,
    })
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    loadReceivables()
  }, [loadReceivables])

  useEffect(() => {
    loadOpenTotals()
  }, [loadOpenTotals])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectableRows = receivables.filter((r) => r.status === 'open')
  const allSelected = selectableRows.length > 0 && selectedIds.size === selectableRows.length

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableRows.map((r) => r.id)))
  }

  const selectedTotal = receivables
    .filter((r) => selectedIds.has(r.id))
    .reduce((s, r) => s + r.amount, 0)

  const handleMarkPaid = async () => {
    const result = await window.api.receivables.markPaid({
      ids: Array.from(selectedIds),
      paid_date: paidDate,
    })
    if (result?.ok === false) {
      show('Erro ao dar baixa', 'error')
      return
    }
    show(`${result.updated ?? selectedIds.size} recebível(is) baixado(s)!`)
    setMarkPaidModal(false)
    setPaidDate(today())
    loadReceivables()
    loadOpenTotals()
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão Financeira"
        title="Contas a Receber"
        subtitle="Acompanhe os recebíveis gerados por lançamento e dê baixa nos pagamentos."
      />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <KpiCard label="Total em Aberto" value={formatBRL(openTotals.amount)} accent />
        <KpiCard label="Qtde em Aberto" value={String(openTotals.count)} />
      </div>

      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <Select
            label="Cliente"
            value={filters.customer_id}
            onChange={(v) => setFilters((f) => ({ ...f, customer_id: String(v) }))}
            options={customers.map((c) => ({
              value: c.id,
              label: c.name,
              displayLabel: c.name,
              searchableLabel: c.name,
            }))}
            optional
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: String(v) }))}
            options={[
              { value: 'open', label: 'Aberto' },
              { value: 'paid', label: 'Pago' },
              { value: '', label: 'Todos' },
            ]}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-5 py-3 mb-4">
          <p className="text-sm font-bold text-primary">
            {selectedIds.size} selecionado(s) · {formatBRL(selectedTotal)}
          </p>
          <Button onClick={() => setMarkPaidModal(true)}>Dar baixa</Button>
        </div>
      )}

      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-6 py-4 w-10">
                {selectableRows.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                )}
              </th>
              {['Data', 'Bilhete', 'Cliente', 'Valor', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {receivables.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum recebível encontrado
                </td>
              </tr>
            )}
            {receivables.map((row) => (
              <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors">
                <td className="px-6 py-4">
                  {row.status === 'open' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {formatDate(row.trip_date || '')}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                  {row.trip_ticket_number ?? '—'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface">{row.customer_name ?? '—'}</td>
                <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                  {formatBRL(row.amount)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${
                      row.status === 'paid'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-tertiary-container/30 text-tertiary'
                    }`}
                  >
                    {row.status === 'paid' ? 'Pago' : 'Aberto'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {markPaidModal && (
        <Modal title="Confirmar Baixa" onClose={() => setMarkPaidModal(false)}>
          <p className="text-sm text-on-surface-variant mb-4">
            Dar baixa em {selectedIds.size} recebível(is), totalizando{' '}
            <span className="font-bold text-on-surface">{formatBRL(selectedTotal)}</span>.
          </p>
          <DatePicker
            label="Data do pagamento"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setMarkPaidModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkPaid}>Confirmar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
