import { useState, useEffect } from 'react'
import { KpiCard, Card } from '../components/ui'
import { formatBRL, currentMonthRange } from '../lib/utils'
import type { DashboardResumo } from '../lib/types'

export function DashboardPage() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const range = currentMonthRange()

  useEffect(() => {
    window.api.dashboard.resumo(range.inicio, range.fim).then((r) => {
      setResumo(r)
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const mesLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f14]">Dashboard</h1>
          <p className="text-[#9e8c75] text-sm capitalize">{mesLabel}</p>
        </div>
      </div>

      {loading && <p className="text-[#9e8c75]">Carregando...</p>}

      {resumo && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <KpiCard label="Receita do mês" value={formatBRL(resumo.receita)} />
            <KpiCard label="Custos do mês" value={formatBRL(resumo.custo)} />
            <KpiCard label="Lucro líquido" value={formatBRL(resumo.lucro)} accent />
            <KpiCard
              label="Viagens realizadas"
              value={String(resumo.totalViagens)}
              sub={`${resumo.kmTotal.toFixed(0)} km totais`}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Por caminhão */}
            <Card>
              <h2 className="font-semibold text-[#2a1f14] mb-4">Resultado por Caminhão</h2>
              {resumo.porCaminhao.length === 0 && <p className="text-[#9e8c75] text-sm">Sem dados</p>}
              <div className="flex flex-col gap-2">
                {resumo.porCaminhao.map((c) => (
                  <div key={c.placa} className="flex justify-between items-center py-2 border-b border-[#f0e9e0] last:border-0">
                    <div>
                      <p className="font-medium text-sm text-[#2a1f14]">{c.placa}</p>
                      <p className="text-xs text-[#9e8c75]">{c.modelo} · {c.km.toFixed(0)} km</p>
                    </div>
                    <span className="font-semibold text-[#7B5B2E]">{formatBRL(c.receita)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Por produto */}
            <Card>
              <h2 className="font-semibold text-[#2a1f14] mb-4">Saída por Produto</h2>
              {resumo.porProduto.length === 0 && <p className="text-[#9e8c75] text-sm">Sem dados</p>}
              <div className="flex flex-col gap-2">
                {resumo.porProduto.map((p) => (
                  <div key={p.nome} className="flex justify-between items-center py-2 border-b border-[#f0e9e0] last:border-0">
                    <div>
                      <p className="font-medium text-sm text-[#2a1f14]">{p.nome}</p>
                      <p className="text-xs text-[#9e8c75]">{p.viagens} viagens</p>
                    </div>
                    <span className="font-semibold text-[#7B5B2E]">{p.tonelagem.toFixed(1)} ton</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Custos por categoria */}
            <Card className="col-span-2">
              <h2 className="font-semibold text-[#2a1f14] mb-4">Custos por Categoria</h2>
              <div className="grid grid-cols-3 gap-3">
                {resumo.porCategoria.map((c) => (
                  <div key={c.categoria} className="bg-[#f5f0ea] rounded-lg p-3">
                    <p className="text-xs text-[#9e8c75] capitalize mb-1">{c.categoria}</p>
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
