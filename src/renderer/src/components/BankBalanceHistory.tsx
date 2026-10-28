import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BankBalanceRecord } from '../../../shared/types'
import {
  currentMonthKey,
  formatBRL,
  formatDateTime,
  formatMonthLabel,
  shiftMonthKey,
} from '../lib/utils'
import { Button, CurrencyInput, Modal, MonthNavigator } from './ui'

/** Axis slots in the chart — one per month between the oldest and newest shown record. */
const MAX_CHART_MONTHS = 12
/** Rows shown in the history table before the user asks for the full history. */
const COLLAPSED_ROWS = 12

const CHART_HEIGHT = 240
const PAD = { top: 24, right: 20, bottom: 30, left: 68 }

interface BankBalanceHistoryProps {
  onError?: (message: string) => void
}

/** Short axis label for a 'YYYY-MM' key: '09/26'. */
function shortMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${month}/${year.slice(2)}`
}

/** Thousands/millions abbreviation for axis ticks, where full BRL would not fit. */
function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  }
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Inclusive list of month keys from `from` to `to`. */
function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  let cursor = from
  while (cursor <= to && months.length < 600) {
    months.push(cursor)
    cursor = shiftMonthKey(cursor, 1)
  }
  return months
}

export function BankBalanceHistory({ onError }: BankBalanceHistoryProps) {
  const [history, setHistory] = useState<BankBalanceRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey())
  const [showAllRows, setShowAllRows] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [balanceInput, setBalanceInput] = useState(0)
  const [saving, setSaving] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [chartWidth, setChartWidth] = useState(0)
  const chartWrapRef = useRef<HTMLDivElement>(null)

  // Held in a ref because callers pass inline arrows: depending on onError directly would
  // give `load` a new identity every render, and the effect below would refetch forever.
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const load = useCallback(async () => {
    try {
      setHistory(await window.api.bankBalances.list())
    } catch (error) {
      console.error('Failed to load bank balance history:', error)
      onErrorRef.current?.('Não foi possível carregar o histórico de saldo bancário.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Another window may record a balance for a month shown here.
  useEffect(() => {
    return window.api.onDataChanged((entity) => {
      if (entity === 'bank-balances') {
        load()
      }
    })
  }, [load])

  const hasHistory = history.length > 0

  // The chart element only exists once there is at least one record, so the observer is
  // attached when the first one shows up, not just on mount.
  useEffect(() => {
    const el = chartWrapRef.current
    if (!hasHistory || !el) {
      return
    }
    setChartWidth(el.clientWidth)
    const observer = new ResizeObserver((entries) => {
      setChartWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasHistory])

  const byMonth = useMemo(() => {
    return new Map(history.map((record) => [record.month, record]))
  }, [history])

  const selectedRecord = byMonth.get(selectedMonth) ?? null

  // The axis spans every month between the oldest and newest record (capped to the most
  // recent MAX_CHART_MONTHS slots), so a month nobody informed shows as a gap in the line
  // instead of being silently collapsed next to the month before it.
  const chartPoints = useMemo(() => {
    if (history.length === 0) {
      return []
    }
    const months = history.map((record) => record.month)
    const axis = monthsBetween(
      months.reduce((a, b) => (a < b ? a : b)),
      months.reduce((a, b) => (a > b ? a : b)),
    ).slice(-MAX_CHART_MONTHS)
    return axis.map((month) => ({ month, balance: byMonth.get(month)?.balance ?? null }))
  }, [history, byMonth])

  const geometry = useMemo(() => {
    const plotWidth = Math.max(chartWidth - PAD.left - PAD.right, 0)
    const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom
    const values = chartPoints
      .map((point) => point.balance)
      .filter((balance): balance is number => balance !== null)
    if (values.length === 0 || plotWidth === 0) {
      return null
    }
    const max = Math.max(...values)
    const min = Math.min(...values)
    // A balance hovers around a large number, so a zero baseline would flatten the line
    // into a straight edge. The domain is padded around the actual range instead, and the
    // axis ticks below spell that range out so the shape can't be read as "from zero".
    const span = max - min
    const domainMax = span === 0 ? max + Math.max(Math.abs(max) * 0.1, 1) : max + span * 0.15
    const domainMin =
      span === 0 ? Math.max(max - Math.max(Math.abs(max) * 0.1, 1), 0) : min - span * 0.15
    const x = (index: number) =>
      chartPoints.length === 1
        ? PAD.left + plotWidth / 2
        : PAD.left + (index / (chartPoints.length - 1)) * plotWidth
    const y = (value: number) =>
      PAD.top + plotHeight - ((value - domainMin) / (domainMax - domainMin)) * plotHeight
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(
      (ratio) => domainMin + ratio * (domainMax - domainMin),
    )
    return { plotWidth, plotHeight, x, y, ticks }
  }, [chartPoints, chartWidth])

  // One path per run of consecutive informed months: the line is never drawn across a
  // month with no record.
  const lineSegments = useMemo(() => {
    if (!geometry) {
      return []
    }
    const segments: string[][] = []
    let current: string[] = []
    chartPoints.forEach((point, index) => {
      if (point.balance === null) {
        if (current.length > 0) {
          segments.push(current)
          current = []
        }
        return
      }
      current.push(`${geometry.x(index)},${geometry.y(point.balance)}`)
    })
    if (current.length > 0) {
      segments.push(current)
    }
    return segments.filter((segment) => segment.length > 1)
  }, [chartPoints, geometry])

  const openEditor = (month: string) => {
    setSelectedMonth(month)
    setBalanceInput(byMonth.get(month)?.balance ?? 0)
    setEditModal(true)
  }

  const saveBalance = async () => {
    setSaving(true)
    try {
      const result = await window.api.bankBalances.set({
        month: selectedMonth,
        balance: balanceInput,
      })
      if (!result.ok) {
        onErrorRef.current?.(
          Object.values(result.errors ?? {})[0] ?? 'Não foi possível salvar o saldo.',
        )
        return
      }
      // Saving broadcasts data:changed, which is what refreshes the Dashboard KPI and any
      // other open window; this reload is just so the section is current before closing.
      await load()
      setEditModal(false)
    } catch (error) {
      console.error('Failed to save bank balance:', error)
      onErrorRef.current?.('Não foi possível salvar o saldo.')
    } finally {
      setSaving(false)
    }
  }

  const visibleRows = showAllRows ? history : history.slice(0, COLLAPSED_ROWS)
  const hoveredPoint = hoverIndex !== null ? chartPoints[hoverIndex] : null
  const hoveredY =
    geometry && hoveredPoint?.balance != null
      ? geometry.y(hoveredPoint.balance)
      : PAD.top + (geometry ? geometry.plotHeight / 2 : 0)
  // Near the top of the plot there is no room above the marker, so the tooltip drops below
  // it instead of being clipped by the card edge.
  const tooltipBelow = hoveredY < PAD.top + 52
  const tooltipTop = tooltipBelow ? hoveredY + 16 : hoveredY - 12
  const tooltipLeft = geometry && hoverIndex !== null ? geometry.x(hoverIndex) : 0

  return (
    <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
          </div>
          <div>
            <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">
              Histórico de Saldo Bancário
            </h2>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Saldo inicial informado manualmente, um registro por mês — o saldo do card soma as
              baixas por cima dele
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator monthKey={selectedMonth} onChange={setSelectedMonth} />
          <Button onClick={() => openEditor(selectedMonth)}>
            {selectedRecord ? 'Editar saldo' : 'Registrar saldo'}
          </Button>
        </div>
      </div>

      {/* Selected month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
            Saldo de <span className="capitalize">{formatMonthLabel(selectedMonth)}</span>
          </p>
          <p className="text-2xl font-black font-headline text-on-surface leading-none">
            {selectedRecord ? formatBRL(selectedRecord.balance) : 'Não informado'}
          </p>
        </div>
        <div className="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
            Registrado em
          </p>
          <p className="text-sm font-bold text-on-surface">
            {selectedRecord ? formatDateTime(selectedRecord.created_at) : '—'}
          </p>
        </div>
        <div className="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
            Última atualização
          </p>
          <p className="text-sm font-bold text-on-surface">
            {selectedRecord ? formatDateTime(selectedRecord.updated_at) : '—'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {!hasHistory ? (
        <div className="rounded-xl border border-dashed border-outline-variant/30 py-12 text-center">
          <p className="text-sm text-on-surface-variant">
            Nenhum saldo bancário registrado ainda. Escolha um mês e registre o saldo para começar o
            histórico.
          </p>
        </div>
      ) : (
        <div ref={chartWrapRef} className="relative">
          <svg
            width="100%"
            height={CHART_HEIGHT}
            role="img"
            aria-label={`Evolução do saldo bancário informado nos últimos ${chartPoints.length} meses`}
          >
            {geometry && (
              <>
                {/* Grid + value ticks */}
                {geometry.ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      x2={PAD.left + geometry.plotWidth}
                      y1={geometry.y(tick)}
                      y2={geometry.y(tick)}
                      className="stroke-outline-variant/25"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 10}
                      y={geometry.y(tick)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-on-surface-variant text-[10px] font-bold"
                    >
                      {formatCompact(tick)}
                    </text>
                  </g>
                ))}

                {/* Selected month marker band */}
                {chartPoints.map((point, index) =>
                  point.month === selectedMonth ? (
                    <line
                      key={`selected-${point.month}`}
                      x1={geometry.x(index)}
                      x2={geometry.x(index)}
                      y1={PAD.top}
                      y2={PAD.top + geometry.plotHeight}
                      className="stroke-primary/30"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  ) : null,
                )}

                {/* Balance line */}
                {lineSegments.map((segment) => (
                  <polyline
                    key={segment[0]}
                    points={segment.join(' ')}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Markers — a 2px surface ring keeps them legible over the line */}
                {chartPoints.map((point, index) =>
                  point.balance === null ? null : (
                    <circle
                      key={point.month}
                      cx={geometry.x(index)}
                      cy={geometry.y(point.balance)}
                      r={hoverIndex === index ? 6 : 4}
                      className="fill-primary stroke-surface-container transition-all"
                      strokeWidth={2}
                    />
                  ),
                )}

                {/* Month labels + hover targets, one column per axis month */}
                {chartPoints.map((point, index) => {
                  const columnWidth =
                    chartPoints.length === 1
                      ? geometry.plotWidth
                      : geometry.plotWidth / (chartPoints.length - 1)
                  return (
                    <g key={`col-${point.month}`}>
                      <text
                        x={geometry.x(index)}
                        y={CHART_HEIGHT - 8}
                        textAnchor="middle"
                        className={`text-[10px] font-black uppercase tracking-tighter ${
                          point.month === selectedMonth
                            ? 'fill-primary'
                            : 'fill-on-surface-variant opacity-70'
                        }`}
                      >
                        {shortMonthLabel(point.month)}
                      </text>
                      {/* Hover/click target for the whole column, so the hit area is much
                          bigger than the marker. Focusable too: keyboard users get the same
                          tooltip and can select the month with Enter/Space. */}
                      <rect
                        x={geometry.x(index) - columnWidth / 2}
                        y={PAD.top}
                        width={columnWidth}
                        height={geometry.plotHeight}
                        fill="transparent"
                        className="cursor-pointer focus:outline-none"
                        role="button"
                        tabIndex={0}
                        aria-label={`${formatMonthLabel(point.month)}: ${
                          point.balance === null ? 'não informado' : formatBRL(point.balance)
                        }`}
                        onMouseEnter={() => setHoverIndex(index)}
                        onMouseLeave={() => setHoverIndex(null)}
                        onFocus={() => setHoverIndex(index)}
                        onBlur={() => setHoverIndex(null)}
                        onClick={() => setSelectedMonth(point.month)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedMonth(point.month)
                          }
                        }}
                      />
                    </g>
                  )
                })}
              </>
            )}
          </svg>

          {geometry && hoverIndex !== null && hoveredPoint && (
            <div
              className={`pointer-events-none absolute -translate-x-1/2 bg-surface-container-highest px-3 py-2 rounded-lg text-[10px] font-black shadow-xl border border-outline-variant/20 whitespace-nowrap z-10 ${
                tooltipBelow ? '' : '-translate-y-full'
              }`}
              style={{ left: tooltipLeft, top: tooltipTop }}
            >
              <span className="text-on-surface-variant capitalize">
                {formatMonthLabel(hoveredPoint.month)}
              </span>
              <span className="block text-on-surface text-xs">
                {hoveredPoint.balance !== null ? formatBRL(hoveredPoint.balance) : 'Não informado'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* History table */}
      {history.length > 0 && (
        <div className="mt-8 rounded-xl overflow-hidden border border-outline-variant/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Mês', 'Saldo registrado', 'Registrado em', 'Última atualização', ''].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {visibleRows.map((record) => (
                <tr
                  key={record.month}
                  className={`transition-colors ${
                    record.month === selectedMonth ? 'bg-primary/5' : 'hover:bg-surface-bright/5'
                  }`}
                >
                  <td className="px-6 py-2 text-sm font-bold text-on-surface capitalize">
                    {formatMonthLabel(record.month)}
                  </td>
                  <td className="px-6 py-2 text-sm font-black font-headline text-on-surface">
                    {formatBRL(record.balance)}
                  </td>
                  <td className="px-6 py-2 text-sm text-on-surface-variant">
                    {formatDateTime(record.created_at)}
                  </td>
                  <td className="px-6 py-2 text-sm text-on-surface-variant">
                    {record.updated_at !== record.created_at
                      ? formatDateTime(record.updated_at)
                      : '—'}
                  </td>
                  <td className="px-6 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditor(record.month)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setShowAllRows((current) => !current)}
              className="w-full py-3 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
            >
              {showAllRows
                ? 'Mostrar menos'
                : `Mostrar todos os ${history.length} meses registrados`}
            </button>
          )}
        </div>
      )}

      {editModal && (
        <Modal
          title={`Saldo bancário · ${formatMonthLabel(selectedMonth)}`}
          onClose={() => setEditModal(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Informe o saldo inicial de{' '}
              <span className="font-bold capitalize">{formatMonthLabel(selectedMonth)}</span>. É um
              registro manual: salvar aqui altera apenas este mês e não recalcula os outros. As
              baixas do mês são somadas a ele no card do Dashboard, sem alterar este valor.
            </p>
            <CurrencyInput
              label="Saldo inicial do mês"
              value={balanceInput}
              onChange={setBalanceInput}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveBalance} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar saldo do mês'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
