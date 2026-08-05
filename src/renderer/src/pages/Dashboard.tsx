import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Button, DatePicker } from '../components/ui'
import type { DashboardSummary } from '../lib/types'
import { currentMonthRange, formatBRL } from '../lib/utils'

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

  useEffect(() => {
    setLoading(true)
    window.api.dashboard.summary(range.start, range.end).then((r) => {
      setSummary(r)
      setLoading(false)
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

  const monthLabel = new Date(range.start).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const fleetCpk = summary ? (summary.totalKm > 0 ? summary.cost / summary.totalKm : 0) : 0
  const displayedTrucks = showAllTrucks
    ? summary?.perTruck || []
    : (summary?.perTruck || []).slice(0, 5)

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
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
                info="Combustível, despesas, deduções"
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
                label="Custo Médio / KM"
                value={fleetCpk.toFixed(2)}
                trend="CPK Médio da Frota"
                info={`${summary.totalKm.toFixed(0)} km percorridos`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Faturamento Mensal */}
              <div className="lg:col-span-2 bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">
                        bar_chart
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">
                        Evolução do Faturamento (Bruto)
                      </h2>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Últimos 6 meses (fixo, não muda com o filtro)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-64 flex items-stretch gap-4 mt-8 px-2">
                  {(() => {
                    const maxRevenue = Math.max(...summary.monthlyRevenue.map((x) => x.revenue), 1)
                    return summary.monthlyRevenue.map((m) => {
                      const height = (m.revenue / maxRevenue) * 100
                      return (
                        <div
                          key={m.month}
                          className="flex-1 flex flex-col items-center gap-3 group"
                        >
                          <div className="relative w-full flex-1 flex flex-col justify-end items-center">
                            <div
                              className="w-full max-w-[40px] bg-primary rounded-t-md transition-all duration-500 group-hover:bg-primary-container group-hover:scale-x-110 origin-bottom"
                              style={{ height: `${Math.max(height, m.revenue > 0 ? 2 : 0)}%` }}
                            />
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-surface-container-highest px-3 py-1.5 rounded-lg text-[10px] font-black text-primary shadow-xl border border-primary/20 whitespace-nowrap z-10">
                              <div>Bruto: {formatBRL(m.revenue)}</div>
                              <div className="text-warning text-[9px] font-normal">
                                (Líquido: {formatBRL(m.revenue - summary.tax / 6)})
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tighter opacity-70">
                            {m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}
                          </span>
                        </div>
                      )
                    })
                  })()}
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
                  {displayedTrucks.map((t) => {
                    const trips = summary.perTruck.filter(
                      (truck) => truck.license_plate === t.license_plate,
                    ).length
                    return (
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
                          {summary.totalTrips > 0
                            ? Math.floor((t.km / summary.totalKm) * summary.totalTrips)
                            : 0}
                        </td>
                        <td className="px-8 py-5 text-right font-headline font-bold text-on-surface">
                          R$ {t.cpk.toFixed(2)}
                        </td>
                        <td
                          className={`px-8 py-5 text-right font-headline font-black ${
                            t.profit >= 0 ? 'text-primary' : 'text-error'
                          }`}
                        >
                          {formatBRL(t.profit)}
                        </td>
                      </tr>
                    )
                  })}
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
