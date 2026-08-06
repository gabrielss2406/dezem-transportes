import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { receivableSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import {
  Button,
  ConfirmModal,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  Select,
  Toast,
  useToast,
} from '../components/ui'
import type { Customer, Receivable } from '../lib/types'
import { formatBRL, formatDate, today } from '../lib/utils'

interface ReceivableFormData {
  customer_id?: number
  amount?: number
  due_date: string
  description?: string
}

const EMPTY_RECEIVABLE: ReceivableFormData = {
  customer_id: undefined,
  amount: undefined,
  due_date: today(),
  description: '',
}

export function ReceivablesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filters, setFilters] = useState<{
    customer_id: string
    status: string
    startDate: string
    endDate: string
  }>({
    customer_id: '',
    status: 'open',
    startDate: '',
    endDate: '',
  })
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [openTotals, setOpenTotals] = useState({ amount: 0, count: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [markPaidModal, setMarkPaidModal] = useState(false)
  const [paidDate, setPaidDate] = useState(today())
  const [createModal, setCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Receivable | null>(null)
  const { toast, show } = useToast()

  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema) as any,
    defaultValues: EMPTY_RECEIVABLE,
  })

  const loadCustomers = useCallback(async () => {
    setCustomers(await window.api.customers.list())
  }, [])

  const loadReceivables = useCallback(async () => {
    const r = await window.api.receivables.list({
      customer_id: filters.customer_id || undefined,
      status: filters.status || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
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

  const markSingleAsPaid = (id: number) => {
    setSelectedIds(new Set([id]))
    setMarkPaidModal(true)
  }

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

  const openCreateModal = () => {
    reset(EMPTY_RECEIVABLE)
    setCreateModal(true)
  }

  const saveReceivable = async (data: ReceivableFormData) => {
    const result = await window.api.receivables.create(data)
    if (result?.ok === false) {
      if (result.errors) {
        for (const [field, message] of Object.entries(result.errors)) {
          setError(field as any, { type: 'manual', message })
        }
      } else {
        show('Erro ao criar conta a receber', 'error')
      }
      return
    }
    show('Conta a receber criada!')
    setCreateModal(false)
    loadReceivables()
    loadOpenTotals()
  }

  const handleDeleteReceivable = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await window.api.receivables.delete(deleteTarget.id)
    if (result?.ok === false) {
      show(result.errors?.form || 'Erro ao excluir', 'error')
      setDeleteTarget(null)
      return
    }
    show('Conta a receber excluída!')
    setDeleteTarget(null)
    loadReceivables()
    loadOpenTotals()
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão Financeira"
        title="Contas a Receber"
        subtitle="Acompanhe os recebíveis gerados por lançamento e dê baixa nos pagamentos."
        actionLabel="Nova Conta"
        onAction={openCreateModal}
      />

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          {
            label: 'Total em Aberto',
            value: formatBRL(openTotals.amount),
            icon: 'account_balance_wallet',
          },
          { label: 'Qtde em Aberto', value: String(openTotals.count), icon: 'receipt_long' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-surface-container-low p-6 rounded-xl flex items-center gap-4 border border-outline-variant/5 shadow-sm"
          >
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {label}
              </p>
              <p className="text-xl font-black text-on-surface font-headline">{value}</p>
            </div>
          </div>
        ))}
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
        <div className="flex-1 min-w-[160px]">
          <DatePicker
            label="Data Inicial"
            value={filters.startDate}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <DatePicker
            label="Data Final"
            value={filters.endDate}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          selectedIds.size > 0 ? 'grid-rows-[1fr] mb-4' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-5 py-3">
            <p className="text-sm font-bold text-primary">
              {selectedIds.size} selecionado(s) · {formatBRL(selectedTotal)}
            </p>
            <Button onClick={() => setMarkPaidModal(true)}>Dar baixa</Button>
          </div>
        </div>
      </div>

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
              {['Data', 'Bilhete', 'Cliente', 'Valor', 'Status', ''].map((h) => (
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
                <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum recebível encontrado
                </td>
              </tr>
            )}
            {receivables.map((row) => (
              <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
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
                  {formatDate(row.trip_date || row.due_date || '')}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                  {row.trip_ticket_number ?? row.description ?? '—'}
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
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => markSingleAsPaid(row.id)}
                        className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="Dar baixa"
                      >
                        <span className="material-symbols-outlined text-xl">paid</span>
                      </button>
                    )}
                    {!row.trip_id && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="p-2 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    )}
                  </div>
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

      {createModal && (
        <Modal title="Nova Conta a Receber" onClose={() => setCreateModal(false)}>
          <form onSubmit={handleSubmit(saveReceivable)} className="flex flex-col gap-4">
            <Controller
              name="customer_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Cliente"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.customer_id?.message}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    displayLabel: c.name,
                    searchableLabel: c.name,
                  }))}
                />
              )}
            />
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Valor"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.amount?.message}
                />
              )}
            />
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Vencimento"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.due_date?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input label="Descrição" optional {...field} error={errors.description?.message} />
              )}
            />
            <div className="flex justify-end gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Excluir conta a receber de ${formatBRL(deleteTarget.amount)}?`}
          onConfirm={handleDeleteReceivable}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
