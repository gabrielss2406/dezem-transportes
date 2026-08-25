import { toPng } from 'html-to-image'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Button, DatePicker, Toast, useToast } from '../components/ui'
import type { DashboardSummary } from '../lib/types'
import { currentMonthRange, formatBRL } from '../lib/utils'

const CHART_SERIES = [
  { key: 'revenue', label: 'Fat. Bruto', color: 'bg-chart-blue', dot: 'bg-chart-blue' },
  { key: 'cost', label: 'Custo', color: 'bg-error', dot: 'bg-error' },
  { key: 'expense', label: 'Despesa', color: 'bg-chart-yellow', dot: 'bg-chart-yellow' },
  { key: 'net', label: 'L. Líquido', color: 'bg-chart-green', dot: 'bg-chart-green' },
] as const

type PctBase = 'revenue' | 'total'

type ChartSeriesKey = (typeof CHART_SERIES)[number]['key']

function KpiBlock({
  label,
  value,
  trend,
  accent,
  info,
}: {
  label: string
  value: string | number
  trend?: string
  accent?: boolean
  info?: string
}) {
  return (
    <div
      className={`rounded-xl p-6 flex flex-col transition-transform duration-200 hover:scale-[1.02] ${
        accent ? 'bg-gradient-to-br from-primary to-primary-container' : 'bg-surface-container-low'
      } border border-outline-variant/5 shadow-sm`}
    >
      <span
        className={`text-[10px] font-black uppercase tracking-widest mb-4 ${
          accent ? 'text-on-primary/70' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>
      <div className={`flex items-baseline gap-1 ${accent ? 'text-on-primary' : ''}`}>
        {typeof value === 'string' && value.includes(',') && (
          <span className={`text-sm font-bold opacity-60 ${accent ? '' : 'text-primary'}`}>R$</span>
        )}
        <span className="text-4xl font-black tracking-tighter font-headline leading-none">
          {value}
        </span>
      </div>
      {trend && (
        <div
          className={`mt-4 flex items-center gap-1 text-[11px] font-bold ${
            accent ? 'text-on-primary/80' : 'text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-xs">trending_up</span>
          {trend}
        </div>
      )}
      {info && (
        <span
          className={`mt-1 text-[10px] opacity-60 ${accent ? 'text-on-primary' : 'text-on-surface-variant'}`}
        >
          {info}
        </span>
      )}
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
      </div>
      <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">{title}</h2>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(currentMonthRange())
  const [showCustom, setShowCustom] = useState(false)
  const [showAllTrucks, setShowAllTrucks] = useState(false)
  const [visibleSeries, setVisibleSeries] = useState<Record<ChartSeriesKey, boolean>>({
    revenue: true,
    cost: true,
    expense: true,
    net: true,
  })
  const [pctBase, setPctBase] = useState<PctBase>('total')
  const chartRef = useRef<HTMLDivElement>(null)
  const { toast, show } = useToast()

  const calcPct = (
    value: number,
    month: (typeof summary)['monthlyRevenue'][0],
    base: PctBase,
  ): number => {
    if (!month) {
      return 0
    }
    if (base === 'revenue') {
      const denom = month.revenue
      return denom > 0 ? (value / denom) * 100 : 0
    }
    const denom =
      Math.abs(month.revenue) + Math.abs(month.cost) + Math.abs(month.expense) + Math.abs(month.net)
    return denom > 0 ? (Math.abs(value) / denom) * 100 : 0
  }

  const formatPct = (
    value: number,
    month: (typeof summary)['monthlyRevenue'][0],
    base: PctBase,
  ): string => {
    const pct = calcPct(value, month, base)
    if (base === 'revenue') {
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
    }
    return `${pct.toFixed(1)}%`
  }

  const toggleSeries = (key: ChartSeriesKey) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleExportChartImage = async () => {
    if (!chartRef.current) {
      return
    }
    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: getComputedStyle(chartRef.current).backgroundColor,
        pixelRatio: 2,
      })
      const res = await fetch(dataUrl)
      const buffer = await res.arrayBuffer()
      const result = await window.api.exportImage({
        fileName: `evolucao_faturamento_${range.start}_a_${range.end}`,
        data: buffer,
      })
      if (result.success) {
        show(`Imagem salva e aberta em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar imagem: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar a imagem.', 'error')
      console.error(error)
    }
  }

  useEffect(() => {
    setLoading(true)
    window.api.dashboard
      .summary(range.start, range.end)
      .then((r) => {
        setSummary(r)
      })
      .catch((err) => {
        console.error('Failed to load dashboard summary:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [range])

  // Trucks/trips/costs/fuel/maintenance all feed into this summary — refetch whenever any
  // of them change elsewhere in the app, instead of only on mount or date-range change.
  useEffect(() => {
    const relevantEntities = new Set(['trucks', 'trips', 'costs', 'fuel', 'maintenance', 'drivers'])
    return window.api.onDataChanged((entity) => {
      if (relevantEntities.has(entity)) {
        window.api.dashboard
          .summary(range.start, range.end)
          .then(setSummary)
          .catch((err) => {
            console.error('Failed to refresh dashboard summary:', err)
          })
      }
    })
  }, [range])

  const handlePreset = (preset: 'current' | 'previous' | 'custom') => {
    if (preset === 'current') {
      setRange(currentMonthRange())
      setShowCustom(false)
    } else if (preset === 'previous') {
      const now = new Date()
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const y = prev.getFullYear()
      const m = String(prev.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(y, prev.getMonth() + 1, 0).getDate()
      setRange({ start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` })
      setShowCustom(false)
    } else {
      setShowCustom(true)
    }
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setRange((r) => ({ ...r, [field]: value }))
  }

  const monthLabel = new Date(
    new Date(range.start).setDate(new Date(range.start).getDate() + 1),
  ).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const fleetCpk = summary ? (summary.totalKm > 0 ? summary.fuelCost / summary.totalKm : 0) : 0
  const fleetFuelLiters = summary?.fuelLiters ?? 0
  const displayedTrucks = showAllTrucks
    ? summary?.perTruck || []
    : (summary?.perTruck || []).slice(0, 5)

  return (
    <div className="px-4 py-8 lg:px-6 lg:py-12 max-w-[1600px] mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <PageHeader title="Visão Geral Operacional" subtitle={monthLabel}>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => handlePreset('current')}
            className={`px-4 py-2 rounded text-sm font-bold transition-all ${
              !showCustom && range.start.startsWith(currentMonthRange().start.slice(0, 7))
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-highest text-on-surface hover:brightness-90'
            }`}
          >
            Este mês
          </button>
          <button
            type="button"
            onClick={() => handlePreset('previous')}
            className={`px-4 py-2 rounded text-sm font-bold transition-all ${
              !showCustom &&
              !range.start.startsWith(currentMonthRange().start.slice(0, 7)) &&
              !showCustom
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-highest text-on-surface hover:brightness-90'
            }`}
          >
            Mês anterior
          </button>
          <button
            type="button"
            onClick={() => handlePreset('custom')}
            className={`px-4 py-2 rounded text-sm font-bold transition-all ${
              showCustom
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-highest text-on-surface hover:brightness-90'
            }`}
          >
            Personalizar
          </button>
        </div>
      </PageHeader>

      {showCustom && (
        <div className="mb-8 p-6 bg-surface-container rounded-2xl border border-outline-variant/10">
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">
            Período customizado
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DatePicker
              label="Data inicial"
              value={range.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
            <DatePicker
              label="Data final"
              value={range.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>
        </div>
      )}

      <div
        className={`transition-opacity duration-300 ${
          loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 text-on-surface-variant animate-pulse">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-sm font-bold">Processando dados da frota...</span>
        </div>
      </div>

      <div
        className={`transition-opacity duration-300 ${
          summary ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {summary && (
          <div className="space-y-12">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl p-6 bg-surface-container-low border border-outline-variant/5 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest mb-4 text-on-surface-variant block">
                  Receita
                </span>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-sm font-bold opacity-60 text-primary">R$</span>
                  <span className="text-2xl font-black tracking-tighter font-headline leading-none">
                    {formatBRL(summary.netRevenue).replace('R$ ', '')}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Líquida ({formatBRL(summary.tax).replace('R$ ', '')} imposto)
                </p>
                <p className="text-xs text-on-surface-variant opacity-70 mt-1">
                  Bruta: R$ {formatBRL(summary.revenue).replace('R$ ', '')}
                </p>
              </div>

              <KpiBlock
                label="Custos Totais"
                value={formatBRL(summary.cost).replace('R$ ', '')}
                info="Combustível, manutenção, comissões, impostos"
              />

              <KpiBlock
                label="Despesas"
                value={formatBRL(summary.expenseCost ?? 0).replace('R$ ', '')}
                info={
                  (summary.expenseOpenCount ?? 0) > 0
                    ? `${summary.expenseOpenCount} em aberto (${formatBRL(summary.expenseOpenValue ?? 0)})`
                    : 'Custos avulsos, fora da operação'
                }
              />

              <div className="rounded-xl p-6 bg-primary border border-outline-variant/5 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest mb-4 text-on-primary/70 block">
                  Lucro Líquido
                </span>
                <div className="flex items-baseline gap-1 mb-3 text-on-primary">
                  <span className="text-sm font-bold opacity-60">R$</span>
                  <span className="text-2xl font-black tracking-tighter font-headline leading-none">
                    {formatBRL(summary.netProfit).replace('R$ ', '')}
                  </span>
                </div>
                <p className="text-xs text-on-primary/80 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  {summary.totalTrips} viagens
                </p>
                <p className="text-xs text-on-primary/70 mt-1">
                  Bruto: R$ {formatBRL(summary.profit).replace('R$ ', '')}
                </p>
              </div>

              <KpiBlock
                label="CPK (Custo por Quilômetro)"
                value={fleetCpk.toFixed(2)}
                trend="KM da Frota / Gastos Totais"
                info={`${summary.totalKm.toFixed(0)} km`}
              />

              <KpiBlock
                label="Saldo Bancário"
                value={formatBRL(summary.bankBalance).replace('R$ ', '')}
                info="Recebido − pago (histórico)"
              />

              <KpiBlock
                label="Contas a Receber"
                value={formatBRL(summary.receivablesOpenTotal).replace('R$ ', '')}
                info="Em aberto (não filtrado por período)"
              />

              <KpiBlock
                label="Contas a Pagar"
                value={formatBRL(summary.costsOpenTotal).replace('R$ ', '')}
                info="Em aberto (não filtrado por período)"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Faturamento Mensal */}
              <div
                ref={chartRef}
                className="lg:col-span-2 bg-surface-container rounded-2xl p-8 border border-outline-variant/10"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">
                        bar_chart
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">
                        Evolução do Faturamento
                      </h2>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Últimos 6 meses (fixo, não muda com o filtro)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportChartImage}
                    title="Exportar gráfico como imagem"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Exportar imagem
                  </button>
                </div>

                {/* Legend / series toggle */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {CHART_SERIES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeries(s.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                        visibleSeries[s.key]
                          ? 'border-outline-variant/20 text-on-surface bg-surface-container-low'
                          : 'border-outline-variant/10 text-on-surface-variant/40 bg-transparent'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${visibleSeries[s.key] ? s.dot : 'bg-outline-variant/40'}`}
                      />
                      {s.label}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-on-surface-variant">Base:</span>
                    <select
                      value={pctBase}
                      onChange={(e) => setPctBase(e.target.value as PctBase)}
                      className="text-[10px] px-2 py-1 rounded border bg-surface-container text-on-surface outline-none"
                    >
                      <option value="revenue">% da Receita</option>
                      <option value="total">% Composição (absolutos)</option>
                    </select>
                  </div>
                </div>

                <div className="h-64 flex items-stretch gap-4 mt-8 px-2">
                  {(() => {
                    const activeSeries = CHART_SERIES.filter((s) => visibleSeries[s.key])
                    const monthsWithData = summary.monthlyRevenue.filter((m) =>
                      activeSeries.some((s) => Math.abs(m[s.key]) > 0),
                    )
                    const maxValue = Math.max(
                      ...monthsWithData.flatMap((m) => activeSeries.map((s) => Math.abs(m[s.key]))),
                      1,
                    )
                    return monthsWithData.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="relative w-full flex-1 flex items-end justify-center gap-1">
                          {activeSeries.map((s) => {
                            const value = m[s.key]
                            const height = (Math.abs(value) / maxValue) * 100
                            const pctStr = formatPct(value, m, pctBase)
                            return (
                              <div
                                key={s.key}
                                className={`flex-1 max-w-[18px] rounded-t-md transition-all duration-500 ${s.color}`}
                                style={{ height: `${Math.max(height, value !== 0 ? 2 : 0)}%` }}
                                title={`${s.label}: ${formatBRL(value)} (${pctStr})`}
                              />
                            )
                          })}
                          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-surface-container-highest px-3 py-1.5 rounded-lg text-[10px] font-black shadow-xl border border-outline-variant/20 whitespace-nowrap z-10 space-y-0.5">
                            {activeSeries.map((s) => {
                              const value = m[s.key]
                              const pctStr = formatPct(value, m, pctBase)
                              return (
                                <div key={s.key} className="text-on-surface">
                                  {s.label}: {formatBRL(value)} ({pctStr})
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tighter opacity-70">
                          {m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}
                        </span>
                      </div>
                    ))
                  })()}
                </div>

                {/* Tabela de valores — sempre visível, garante que o export em imagem
                    saia com os números (o tooltip de hover não aparece em screenshot) */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20">
                        <th className="py-1.5 pr-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                          Mês
                        </th>
                        {CHART_SERIES.filter((s) => visibleSeries[s.key]).map((s) => (
                          <th
                            key={s.key}
                            className="py-1.5 px-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant"
                          >
                            <span className="inline-flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {summary.monthlyRevenue
                        .filter((m) =>
                          CHART_SERIES.filter((s) => visibleSeries[s.key]).some(
                            (s) => Math.abs(m[s.key]) > 0,
                          ),
                        )
                        .map((m) => (
                          <tr key={m.month}>
                            <td className="py-1.5 pr-3 text-[10px] font-bold text-on-surface-variant uppercase">
                              {m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}
                            </td>
                            {CHART_SERIES.filter((s) => visibleSeries[s.key]).map((s) => (
                              <td
                                key={s.key}
                                className="py-1.5 px-3 text-[10px] font-bold text-on-surface"
                              >
                                {formatBRL(m[s.key])}{' '}
                                <span className="font-medium text-on-surface-variant">
                                  ({formatPct(m[s.key], m, pctBase)})
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alertas Consolidados */}
              <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">
                      notifications_active
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">
                      Alertas Operacionais
                    </h2>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      Status atual (não filtrado por período)
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Alertas de Manutenção */}
                  {(summary.maintenanceSummary.overdueCount > 0 ||
                    summary.maintenanceSummary.dueSoonCount > 0) && (
                    <>
                      {summary.maintenanceSummary.overdueCount > 0 && (
                        <div className="p-3 rounded-lg bg-error-container/30 border border-error-container flex items-start gap-3">
                          <span className="material-symbols-outlined text-error text-lg shrink-0">
                            warning
                          </span>
                          <div>
                            <p className="text-xs font-black text-error uppercase">
                              Manutenção Vencida
                            </p>
                            <p className="text-sm font-bold text-error">
                              {summary.maintenanceSummary.overdueCount} item(ns)
                            </p>
                          </div>
                        </div>
                      )}
                      {summary.maintenanceSummary.dueSoonCount > 0 && (
                        <div className="p-3 rounded-lg bg-warning-container/30 border border-warning-container flex items-start gap-3">
                          <span className="material-symbols-outlined text-warning text-lg shrink-0">
                            schedule
                          </span>
                          <div>
                            <p className="text-xs font-black text-warning uppercase">
                              Próxima Manutenção
                            </p>
                            <p className="text-sm font-bold text-warning">
                              {summary.maintenanceSummary.dueSoonCount} item(ns)
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Status OK */}
                  {summary.maintenanceSummary.overdueCount === 0 &&
                    summary.maintenanceSummary.dueSoonCount === 0 && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-lg shrink-0">
                          check_circle
                        </span>
                        <div>
                          <p className="text-xs font-black text-primary uppercase">Status OK</p>
                          <p className="text-sm font-bold text-on-surface">Frota em dia</p>
                        </div>
                      </div>
                    )}

                  {/* Items mais urgentes */}
                  {summary.maintenanceSummary.alerts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10">
                      <p className="text-xs font-black text-on-surface-variant uppercase mb-3 tracking-widest">
                        Itens urgentes
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {summary.maintenanceSummary.alerts.map((alert, i) => (
                          <div
                            key={`${alert.truck_id}-${alert.type_name}-${i}`}
                            className="p-2 rounded bg-surface-container-high border border-outline-variant/5 text-[12px]"
                          >
                            <p className="font-bold text-on-surface">{alert.truck_license_plate}</p>
                            <p className="text-on-surface-variant text-[11px]">{alert.type_name}</p>
                            <div
                              className={`mt-1 text-[10px] font-black ${
                                alert.status === 'overdue' ? 'text-error' : 'text-warning'
                              }`}
                            >
                              {alert.status === 'overdue'
                                ? `${Math.abs(alert.km_remaining).toFixed(0)} km vencido`
                                : `${alert.km_remaining.toFixed(0)} km restante`}
                            </div>
                          </div>
                        ))}
                      </div>

                      {summary.maintenanceSummary.alerts.length <
                        summary.maintenanceSummary.overdueCount +
                          summary.maintenanceSummary.dueSoonCount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/manutencao')}
                          className="w-full mt-3 text-xs"
                        >
                          Ver tudo (
                          {summary.maintenanceSummary.overdueCount +
                            summary.maintenanceSummary.dueSoonCount}
                          )
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rentabilidade por Caminhão — Limitado */}
            <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
              <div className="p-8 pb-4 flex items-center justify-between">
                <SectionHeader title="Rentabilidade por Caminhão" icon="local_shipping" />
                {!showAllTrucks && (summary?.perTruck || []).length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTrucks(true)}
                    className="text-xs font-bold text-primary hover:text-primary-container"
                  >
                    Ver todos ({(summary?.perTruck || []).length})
                  </button>
                )}
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Caminhão
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                      Viagens
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                      CPK
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                      Lucro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {displayedTrucks.map((t) => (
                    <tr
                      key={t.license_plate}
                      className="hover:bg-surface-bright/5 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <p className="font-black text-on-surface">{t.license_plate}</p>
                        <p className="text-xs text-on-surface-variant opacity-60">
                          {t.model} · {t.km.toFixed(0)} km
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-on-surface">
                        {t.trip_count}
                      </td>
                      <td className="px-8 py-5 text-right font-headline font-bold text-on-surface">
                        {t.cpk != null ? (
                          `R$ ${t.cpk.toFixed(2)}`
                        ) : (
                          <span
                            className="text-on-surface-variant opacity-50"
                            title="Sem leituras de odômetro suficientes no período"
                          >
                            N/D
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-8 py-5 text-right font-headline font-black ${
                          t.profit >= 0 ? 'text-primary' : 'text-error'
                        }`}
                      >
                        {formatBRL(t.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showAllTrucks && (
                <div className="p-4 bg-surface-container-high border-t border-outline-variant/10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllTrucks(false)}
                    className="text-xs font-bold text-primary hover:text-primary-container"
                  >
                    Mostrar menos
                  </button>
                </div>
              )}
            </div>

            {/* Top Clientes e Por Tipo de Carga */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Clientes */}
              <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
                <div className="p-8 pb-4">
                  <SectionHeader title="Top Clientes" icon="groups" />
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-high">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Cliente
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Viagens
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Ton
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Receita
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(summary?.perCustomer || []).map((c) => (
                      <tr
                        key={c.customer_name}
                        className="hover:bg-surface-bright/5 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <p className="font-black text-on-surface">{c.customer_name}</p>
                          <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">
                            Líquida: R$ {formatBRL(c.netRevenue).replace('R$ ', '')}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-on-surface">
                          {c.trips}
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-on-surface">
                          {c.tonnage.toFixed(0)}
                        </td>
                        <td className="px-8 py-5 text-right font-headline font-black text-primary">
                          {formatBRL(c.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Por Tipo de Carga */}
              <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
                <div className="p-8 pb-4">
                  <SectionHeader title="Por Tipo de Carga" icon="inventory_2" />
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-high">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Produto
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Viagens
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Ton
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Receita
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(summary?.perProduct || []).map((p) => (
                      <tr
                        key={p.product_name}
                        className="hover:bg-surface-bright/5 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <p className="font-black text-on-surface">{p.product_name}</p>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-on-surface">
                          {p.trips}
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-on-surface">
                          {p.tonnage.toFixed(0)}
                        </td>
                        <td className="px-8 py-5 text-right font-headline font-black text-primary">
                          {formatBRL(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Composição de Custos */}
            <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
              <SectionHeader title="Composição de Custos" icon="pie_chart" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-8">
                {summary.perCategory.map((c) => (
                  <div
                    key={c.category}
                    className="bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-colors"
                  >
                    <p className="text-[10px] font-black tracking-widest text-on-surface-variant mb-3 capitalize">
                      {c.category}
                    </p>
                    <p className="font-black text-on-surface text-xl font-headline leading-tight">
                      {formatBRL(c.total)}
                    </p>
                    <div className="mt-4 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/40"
                        style={{ width: `${(c.total / summary.cost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
