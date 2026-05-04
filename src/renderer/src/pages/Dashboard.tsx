import { useEffect, useState } from 'react'
import type { DashboardSummary } from '../lib/types'
import { currentMonthRange, formatBRL } from '../lib/utils'

function KpiBlock({
  label,
  value,
  trend,
  accent,
}: {
  label: string
  value: string
  trend?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-8 flex flex-col transition-transform duration-200 hover:scale-[1.02] ${
        accent ? 'bg-gradient-to-br from-primary to-primary-container' : 'bg-surface-container-low'
      }`}
    >
      <span
        className={`text-xs font-bold uppercase tracking-widest mb-6 ${
          accent ? 'text-on-primary/70' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>
      <div className={`flex items-baseline gap-2 ${accent ? 'text-on-primary' : ''}`}>
        <span className={`text-xl font-bold opacity-60 ${accent ? '' : 'text-primary'}`}>R$</span>
        <span className="text-5xl font-black tracking-tighter font-headline">{value}</span>
      </div>
      {trend && (
        <div
          className={`mt-6 flex items-center gap-2 text-xs font-bold ${
            accent ? 'text-on-primary/80' : 'text-tertiary'
          }`}
        >
          <span className="material-symbols-outlined text-sm">trending_up</span>
          {trend}
        </div>
      )}
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
  }, [])

  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
          Dezem Transportes
        </span>
        <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface">
          Dashboard
        </h1>
        <p className="text-on-surface-variant mt-1 capitalize">{monthLabel}</p>
      </div>

      {loading && <p className="text-on-surface-variant text-sm">Carregando...</p>}

      {summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <KpiBlock
              label="Receita Total"
              value={formatBRL(summary.revenue).replace('R$ ', '')}
              trend="Período atual"
            />
            <KpiBlock label="Custo Total" value={formatBRL(summary.cost).replace('R$ ', '')} />
            <KpiBlock
              label="Lucro Líquido"
              value={formatBRL(summary.profit).replace('R$ ', '')}
              trend={`${summary.totalTrips} viagens · ${summary.totalKm.toFixed(0)} km`}
              accent
            />
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Per Truck */}
            <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
              <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-high">
                <h2 className="font-headline font-bold text-on-surface">Resultado por Caminhão</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Caminhão
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                      Receita
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {summary.perTruck.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-6 py-8 text-center text-on-surface-variant text-sm"
                      >
                        Sem dados
                      </td>
                    </tr>
                  )}
                  {summary.perTruck.map((c) => (
                    <tr
                      key={c.license_plate}
                      className="hover:bg-surface-bright/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-surface-container-lowest rounded flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-sm">
                              local_shipping
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{c.license_plate}</p>
                            <p className="text-xs text-on-surface-variant opacity-60">
                              {c.model} · {c.km.toFixed(0)} km
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary text-sm text-right">
                        {formatBRL(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per Product */}
            <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
              <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-high">
                <h2 className="font-headline font-bold text-on-surface">Saída por Produto</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Produto
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                      Tonelagem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {summary.perProduct.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-6 py-8 text-center text-on-surface-variant text-sm"
                      >
                        Sem dados
                      </td>
                    </tr>
                  )}
                  {summary.perProduct.map((p) => (
                    <tr key={p.name} className="hover:bg-surface-bright/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface text-sm">{p.name}</p>
                        <p className="text-xs text-on-surface-variant opacity-60">
                          {p.trips} viagens
                        </p>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary text-sm text-right">
                        {p.tonnage.toFixed(1)} ton
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Costs by Category */}
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-high">
              <h2 className="font-headline font-bold text-on-surface">Custos por Categoria</h2>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {summary.perCategory.map((c) => (
                <div key={c.category} className="bg-surface-container-high p-5 rounded-lg">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 capitalize">
                    {c.category}
                  </p>
                  <p className="font-black text-on-surface text-xl font-headline">
                    {formatBRL(c.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
