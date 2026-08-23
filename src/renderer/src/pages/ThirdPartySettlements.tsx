import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import {
  Button,
  DatePicker,
  Modal,
  MonthNavigator,
  Select,
  Toast,
  useToast,
} from '../components/ui'
import { generatePdf } from '../lib/pdfGenerator'
import type { Contractor, ThirdPartySettlement } from '../lib/types'
import {
  currentMonthKey,
  formatBRL,
  formatDate,
  formatMonthLabel,
  monthRangeFromKey,
  today,
} from '../lib/utils'

export function ThirdPartySettlementsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filters, setFilters] = useState<{
    contractor_id: string
    status: string
  }>({
    contractor_id: '',
    status: 'pending',
  })
  const [settlementsMonth, setSettlementsMonth] = useState(currentMonthKey())
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month')
  const [rangeStart, setRangeStart] = useState(today())
  const [rangeEnd, setRangeEnd] = useState(today())
  const [settlements, setSettlements] = useState<ThirdPartySettlement[]>([])
  const [pendingTotals, setPendingTotals] = useState({ amount: 0, count: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [markSettledModal, setMarkSettledModal] = useState(false)
  const [settledDate, setSettledDate] = useState(today())
  const { toast, show } = useToast()

  const loadContractors = useCallback(async () => {
    setContractors(await window.api.contractors.list())
  }, [])

  const loadSettlements = useCallback(async () => {
    const { start, end } =
      filterMode === 'month'
        ? monthRangeFromKey(settlementsMonth)
        : { start: rangeStart, end: rangeEnd }
    const s = await window.api.thirdPartySettlements.list({
      contractor_id: filters.contractor_id || undefined,
      status: filters.status || undefined,
      startDate: start,
      endDate: end,
    })
    setSettlements(s)
    setSelectedIds(new Set())
  }, [filters, settlementsMonth, filterMode, rangeStart, rangeEnd])

  const loadPendingTotals = useCallback(async () => {
    const pending = await window.api.thirdPartySettlements.list({ status: 'pending' })
    setPendingTotals({
      amount: pending.reduce((s, r) => s + r.amount, 0),
      count: pending.length,
    })
  }, [])

  useEffect(() => {
    loadContractors()
  }, [loadContractors])

  useEffect(() => {
    loadSettlements()
  }, [loadSettlements])

  useEffect(() => {
    loadPendingTotals()
  }, [loadPendingTotals])

  useEffect(() => {
    const unsubscribe = window.api.onDataChanged((entity) => {
      if (entity === 'trips' || entity === 'third-party-settlements') {
        loadSettlements()
        loadPendingTotals()
      }
    })
    return unsubscribe
  }, [loadSettlements, loadPendingTotals])

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

  const selectableRows = settlements.filter((s) => s.status === 'pending')
  const allSelected = selectableRows.length > 0 && selectedIds.size === selectableRows.length

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableRows.map((s) => s.id)))
  }

  const selectedTotal = settlements
    .filter((s) => selectedIds.has(s.id))
    .reduce((s, r) => s + r.amount, 0)

  const markSingleAsSettled = (id: number) => {
    setSelectedIds(new Set([id]))
    setMarkSettledModal(true)
  }

  const handleMarkSettled = async () => {
    const result = await window.api.thirdPartySettlements.markSettled({
      ids: Array.from(selectedIds),
      settled_date: settledDate,
    })
    if (result?.ok === false) {
      show('Erro ao dar baixa', 'error')
      return
    }
    show(`${result.updated ?? selectedIds.size} repasse(s) baixado(s)!`)
    setMarkSettledModal(false)
    setSettledDate(today())
    loadSettlements()
    loadPendingTotals()
  }

  const handleExportPdf = async () => {
    const subtitleParts: string[] = []
    const fileNameParts: string[] = []

    if (filterMode === 'month') {
      const monthLabel = formatMonthLabel(settlementsMonth)
      subtitleParts.push(`Mês: ${monthLabel}`)
      fileNameParts.push(settlementsMonth)
    } else {
      subtitleParts.push(`Período: ${formatDate(rangeStart)} a ${formatDate(rangeEnd)}`)
      fileNameParts.push(`${rangeStart}_a_${rangeEnd}`)
    }
    if (filters.contractor_id) {
      const contractor = contractors.find((c) => String(c.id) === String(filters.contractor_id))
      if (contractor) {
        subtitleParts.push(`Terceiro: ${contractor.name}`)
        fileNameParts.push(contractor.name)
      }
    }
    if (filters.status) {
      subtitleParts.push(`Status: ${filters.status === 'settled' ? 'Baixado' : 'Pendente'}`)
    }

    const safeFileName = fileNameParts
      .join('_')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w-]/g, '')

    const fileName = safeFileName ? `repasses_terceiros_${safeFileName}` : 'repasses_terceiros'

    const headers = ['Data', 'Bilhete', 'Cliente', 'Terceiro', 'Valor', 'Status']
    const data = settlements.map((row) => [
      formatDate(row.trip_date || ''),
      row.trip_ticket_number ?? '—',
      row.customer_name ?? '—',
      row.contractor_name ?? '—',
      formatBRL(row.amount),
      row.status === 'settled' ? 'Baixado' : 'Pendente',
    ])
    const total = settlements.reduce((s, r) => s + r.amount, 0)
    const foot = [['TOTAL', '', '', '', formatBRL(total), '']]

    const pdfData = generatePdf({
      title: 'Repasses a Terceiros',
      subtitle: subtitleParts.join(' | '),
      headers,
      data,
      foot,
    })

    try {
      const result = await window.api.exportPdf({ fileName, data: pdfData })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão Financeira"
        title="Repasses a Terceiros"
        subtitle="Prestação de contas: acompanhe e baixe os valores devidos aos terceiros por lançamentos de repasse."
        secondaryActionLabel="Exportar PDF"
        onSecondaryAction={handleExportPdf}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="grid grid-cols-2 gap-3 flex-1 min-w-[280px]">
          {[
            {
              label: 'Total Pendente',
              value: formatBRL(pendingTotals.amount),
              icon: 'sync_alt',
            },
            { label: 'Qtde Pendente', value: String(pendingTotals.count), icon: 'receipt_long' },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="bg-surface-container-low p-3 rounded-xl flex items-center gap-3 border border-outline-variant/5 shadow-sm"
            >
              <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-surface-container-high rounded-lg p-1 border border-outline-variant/10">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                filterMode === 'month'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                filterMode === 'range'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Período
            </button>
          </div>
          {filterMode === 'month' ? (
            <MonthNavigator monthKey={settlementsMonth} onChange={setSettlementsMonth} />
          ) : (
            <div className="flex items-center gap-2">
              <DatePicker value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              <span className="text-on-surface-variant text-sm">a</span>
              <DatePicker value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Select
            label="Terceiro"
            value={filters.contractor_id}
            onChange={(v) => setFilters((f) => ({ ...f, contractor_id: String(v) }))}
            options={contractors.map((c) => ({
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
              { value: 'pending', label: 'Pendente' },
              { value: 'settled', label: 'Baixado' },
              { value: '', label: 'Todos' },
            ]}
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
            <Button onClick={() => setMarkSettledModal(true)}>Dar baixa</Button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-6 py-1.5 w-10">
                {selectableRows.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                )}
              </th>
              {['Data', 'Bilhete', 'Cliente', 'Terceiro', 'Valor', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="px-6 py-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {settlements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum repasse encontrado
                </td>
              </tr>
            )}
            {settlements.map((row) => (
              <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                <td className="px-6 py-1.5">
                  {row.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-6 py-1.5 text-sm text-on-surface-variant">
                  {formatDate(row.trip_date || '')}
                </td>
                <td className="px-6 py-1.5 text-sm font-mono text-on-surface-variant">
                  {row.trip_ticket_number ?? '—'}
                </td>
                <td className="px-6 py-1.5 text-sm text-on-surface">{row.customer_name ?? '—'}</td>
                <td className="px-6 py-1.5 text-sm text-on-surface">
                  {row.contractor_name ?? '—'}
                </td>
                <td className="px-6 py-1.5 font-black font-headline text-on-surface text-sm">
                  {formatBRL(row.amount)}
                </td>
                <td className="px-6 py-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${
                      row.status === 'settled'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-tertiary-container/30 text-tertiary'
                    }`}
                  >
                    {row.status === 'settled' ? 'Baixado' : 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-1.5">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => markSingleAsSettled(row.id)}
                        className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="Dar baixa"
                      >
                        <span className="material-symbols-outlined text-xl">paid</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {markSettledModal && (
        <Modal title="Confirmar Baixa" onClose={() => setMarkSettledModal(false)}>
          <p className="text-sm text-on-surface-variant mb-4">
            Dar baixa em {selectedIds.size} repasse(s), totalizando{' '}
            <span className="font-bold text-on-surface">{formatBRL(selectedTotal)}</span>.
          </p>
          <DatePicker
            label="Data do pagamento ao terceiro"
            value={settledDate}
            onChange={(e) => setSettledDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setMarkSettledModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkSettled}>Confirmar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
