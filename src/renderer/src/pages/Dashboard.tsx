import { useState, useEffect } from 'react'
import { KpiCard, Card } from '../components/ui'
import { PageHeader } from '../components/PageHeader'
import { formatBRL, currentMonthRange } from '../lib/utils'
import type { DashboardSummary } from '../lib/types'

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
    <div className="p-8 max-w-6xl">
      <PageHeader title="Dashboard" subtitle={monthLabel} />

      {loading && <p className="text-[#9e8c75]">Carregando...</p>}

      {summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <KpiCard label="Receita do mês" value={formatBRL(summary.revenue)} />
            <KpiCard label="Custos do mês" value={formatBRL(summary.cost)} />
            <KpiCard label="Lucro líquido" value={formatBRL(summary.profit)} accent />
            <KpiCard
              label="Viagens realizadas"
              value={String(summary.totalTrips)}
              sub={`${summary.totalKm.toFixed(0)} km totais`}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Per Truck */}
            <Card>
              <h2 className="font-semibold text-[#2a1f14] mb-4">Resultado por Caminhão</h2>
              {summary.perTruck.length === 0 && <p className="text-[#9e8c75] text-sm">Sem dados</p>}
              <div className="flex flex-col gap-2">
                {summary.perTruck.map((c) => (
                  <div key={c.license_plate} className="flex justify-between items-center py-2 border-b border-[#f0e9e0] last:border-0">
                    <div>
                      <p className="font-medium text-sm text-[#2a1f14]">{c.license_plate}</p>
                      <p className="text-xs text-[#9e8c75]">{c.model} · {c.km.toFixed(0)} km</p>
                    </div>
                    <span className="font-semibold text-[#7B5B2E]">{formatBRL(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Per Product */}
            <Card>
              <h2 className="font-semibold text-[#2a1f14] mb-4">Saída por Produto</h2>
              {summary.perProduct.length === 0 && <p className="text-[#9e8c75] text-sm">Sem dados</p>}
              <div className="flex flex-col gap-2">
                {summary.perProduct.map((p) => (
                  <div key={p.name} className="flex justify-between items-center py-2 border-b border-[#f0e9e0] last:border-0">
                    <div>
                      <p className="font-medium text-sm text-[#2a1f14]">{p.name}</p>
                      <p className="text-xs text-[#9e8c75]">{p.trips} viagens</p>
                    </div>
                    <span className="font-semibold text-[#7B5B2E]">{p.tonnage.toFixed(1)} ton</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Costs by Category */}
            <Card className="col-span-2">
              <h2 className="font-semibold text-[#2a1f14] mb-4">Custos por Categoria</h2>
              <div className="grid grid-cols-3 gap-3">
                {summary.perCategory.map((c) => (
                  <div key={c.category} className="bg-[#f5f0ea] rounded-lg p-3">
                    <p className="text-xs text-[#9e8c75] capitalize mb-1">{c.category}</p>
                    <p className="font-semibold text-[#2a1f14]">{formatBRL(c.total)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
