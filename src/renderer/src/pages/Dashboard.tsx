import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
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
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const range = currentMonthRange()

  useEffect(() => {
    window.api.dashboard.summary(range.start, range.end).then((r) => {
      setSummary(r)
      setLoading(false)
    })
  }, [range.start, range.end])

  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // CPK Médio da Frota
  const fleetCpk = summary ? (summary.totalKm > 0 ? summary.cost / summary.totalKm : 0) : 0

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
      <PageHeader title="Visão Geral Operacional" subtitle={monthLabel} />

      {loading && (
        <div className="flex items-center gap-3 text-on-surface-variant animate-pulse">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-sm font-bold">Processando dados da frota...</span>
        </div>
      )}

      {summary && (
        <div className="space-y-12">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiBlock
              label="Receita Bruta"
              value={formatBRL(summary.revenue).replace('R$ ', '')}
              trend="Faturamento do mês"
            />
            <KpiBlock
              label="Custos Totais"
              value={formatBRL(summary.cost).replace('R$ ', '')}
              info="Inclui combustível e despesas"
            />
            <KpiBlock
              label="Lucro Líquido"
              value={formatBRL(summary.profit).replace('R$ ', '')}
              accent
              trend={`${summary.totalTrips} lançamentos concluídos`}
            />
            <KpiBlock
              label="Custo Médio / KM"
              value={fleetCpk.toFixed(2)}
              trend="CPK Médio da Frota"
              info={`${summary.totalKm.toFixed(0)} km percorridos`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. Faturamento Mensal (Chart) */}
            <div className="lg:col-span-2 bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
              <SectionHeader title="Evolução do Faturamento" icon="bar_chart" />
              <div className="h-64 flex items-stretch gap-4 mt-8 px-2">
                {(() => {
                  const maxRevenue = Math.max(...summary.monthlyRevenue.map((x) => x.revenue), 1)
                  return summary.monthlyRevenue.map((m) => {
                    const height = (m.revenue / maxRevenue) * 100
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="relative w-full flex-1 flex flex-col justify-end items-center">
                          <div
                            className="w-full max-w-[40px] bg-primary rounded-t-md transition-all duration-500 group-hover:bg-primary-container group-hover:scale-x-110 origin-bottom"
                            style={{ height: `${Math.max(height, m.revenue > 0 ? 2 : 0)}%` }}
                          />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-surface-container-highest px-3 py-1.5 rounded-lg text-[10px] font-black text-primary shadow-xl border border-primary/20 whitespace-nowrap z-10">
                            {formatBRL(m.revenue)}
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

            {/* 2. Alertas de Manutenção */}
            <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
              <SectionHeader title="Status de Manutenção" icon="build" />
              <div className="space-y-4">
                {summary.maintenanceAlerts.map((m) => {
                  const kmSinceLast = m.km_since_last_maintenance
                  const isCritical = kmSinceLast > 10000
                  const isWarning = kmSinceLast > 8000

                  return (
                    <div
                      key={m.license_plate}
                      className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black text-on-surface leading-tight">
                          {m.license_plate}
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">
                          {kmSinceLast.toFixed(0)} km desde última revisão
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          isCritical
                            ? 'bg-error-container text-on-error-container'
                            : isWarning
                              ? 'bg-warning-container text-on-warning-container'
                              : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {isCritical ? 'CRÍTICO' : isWarning ? 'ALERTA' : 'OK'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 3. Lucratividade por Caminhão */}
            <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
              <div className="p-8 pb-4">
                <SectionHeader title="Rentabilidade por Caminhão" icon="local_shipping" />
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Caminhão
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
                  {summary.perTruck.map((t) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Custos por Categoria (Visual) */}
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
  )
}
