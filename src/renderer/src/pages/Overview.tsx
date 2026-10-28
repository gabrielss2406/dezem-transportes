import { useCallback, useEffect, useState } from 'react'
import { Button, CurrencyInput, Modal, Toast, useToast } from '../components/ui'
import { currentMonthKey, formatBRL, formatMonthLabel } from '../lib/utils'

interface OverviewProps {
  user?: string
  onNavigate: (path: string, state?: any) => void
}

const sections = [
  {
    title: 'Operações',
    modules: [
      {
        title: 'Lançamentos',
        description: 'Registre viagens e acompanhe a operação.',
        icon: 'route',
        path: '/trips',
      },
      {
        title: 'Manutenção',
        description: 'Controle serviços e alertas da frota.',
        icon: 'build',
        path: '/maintenance',
      },
      {
        title: 'Custos',
        description: 'Gerencie custos, salários e abastecimentos.',
        icon: 'payments',
        path: '/costs',
      },
    ],
  },
  {
    title: 'Cadastros',
    modules: [
      {
        title: 'Caminhões',
        description: 'Mantenha os veículos e hodômetros atualizados.',
        icon: 'local_shipping',
        path: '/trucks',
      },
      {
        title: 'Motoristas',
        description: 'Gerencie motoristas, salários e vínculos.',
        icon: 'badge',
        path: '/drivers',
      },
      {
        title: 'Produtos',
        description: 'Cadastre produtos e valores de referência.',
        icon: 'inventory_2',
        path: '/products',
      },
      {
        title: 'Clientes',
        description: 'Consulte clientes e seus dados comerciais.',
        icon: 'group',
        path: '/customers',
      },
      {
        title: 'Tabela de Preços',
        description: 'Configure preços por cliente e produto.',
        icon: 'request_quote',
        path: '/prices',
      },
      {
        title: 'Fornecedores',
        description: 'Organize postos, oficinas e demais fornecedores.',
        icon: 'handshake',
        path: '/suppliers',
      },
      {
        title: 'Terceirizados',
        description: 'Gerencie empresas e parceiros terceirizados.',
        icon: 'group_add',
        path: '/contractors',
      },
    ],
  },
  {
    title: 'Financeiro',
    modules: [
      {
        title: 'Dashboard',
        description: 'Acompanhe indicadores e rentabilidade da frota.',
        icon: 'analytics',
        path: '/',
      },
      {
        title: 'Contas a Receber',
        description: 'Controle recebíveis e baixas de clientes.',
        icon: 'account_balance_wallet',
        path: '/receivables',
      },
      {
        title: 'Repasses a Terceiros',
        description: 'Acompanhe valores pendentes de repasse.',
        icon: 'sync_alt',
        path: '/third-party-settlements',
      },
    ],
  },
  {
    title: 'Sistema',
    modules: [
      {
        title: 'Configurações',
        description: 'Ajuste preferências e integrações do sistema.',
        icon: 'settings',
        path: '/settings',
      },
    ],
  },
]

export function OverviewPage({ user, onNavigate }: OverviewProps) {
  // The quick action only ever reads and writes the current month's snapshot. Earlier
  // months are edited from the Histórico de Saldo Bancário section on the Dashboard.
  const [month] = useState(currentMonthKey())
  const [bankBalance, setBankBalance] = useState<number | null>(null)
  const [bankBalanceInput, setBankBalanceInput] = useState(0)
  const [bankBalanceModal, setBankBalanceModal] = useState(false)
  const { toast, show } = useToast()

  const loadBankBalance = useCallback(async () => {
    const record = await window.api.bankBalances.get(month)
    setBankBalance(record ? record.balance : null)
  }, [month])

  useEffect(() => {
    loadBankBalance().catch((error) => {
      console.error('Failed to load bank balance:', error)
    })
  }, [loadBankBalance])

  const openBankBalance = () => {
    setBankBalanceInput(bankBalance ?? 0)
    setBankBalanceModal(true)
  }

  const saveBankBalance = async () => {
    const result = await window.api.bankBalances.set({ month, balance: bankBalanceInput })
    if (!result.ok) {
      show(Object.values(result.errors ?? {})[0] ?? 'Erro ao salvar o saldo.', 'error')
      return
    }
    setBankBalance(bankBalanceInput)
    setBankBalanceModal(false)
    show('Saldo bancário atualizado!', 'success')
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface mb-2">
          {user ? `Bem-vindo, ${user}` : 'Bem-vindo'}
        </h1>
        <p className="text-on-surface-variant">
          Selecione um módulo ou uma ação rápida para iniciar
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-12">
        <button
          type="button"
          onClick={() => onNavigate('/trips', { openModal: true })}
          className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nova Viagem
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/costs', { openModal: true })}
          className="inline-flex items-center gap-2 px-4 py-3 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-container-high active:scale-95 transition-all text-sm border border-outline-variant/20"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Novo Custo
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/maintenance', { openModal: true })}
          className="inline-flex items-center gap-2 px-4 py-3 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-container-high active:scale-95 transition-all text-sm border border-outline-variant/20"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nova Manutenção
        </button>
        <button
          type="button"
          onClick={openBankBalance}
          className="inline-flex items-center gap-2 px-4 py-3 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-container-high active:scale-95 transition-all text-sm border border-outline-variant/20"
        >
          <span className="material-symbols-outlined text-lg">account_balance</span>
          <span>Saldo Bancário</span>
          <span className="text-xs font-medium text-on-surface-variant">
            {bankBalance === null ? 'Não informado' : formatBRL(bankBalance)}
          </span>
        </button>
      </div>

      {/* Modules Grid by Section */}
      {sections.map((section) => (
        <div key={section.title} className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-4">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.modules.map((mod) => (
              <button
                key={mod.path}
                type="button"
                className="group text-left bg-surface-container-low rounded-xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 border border-outline-variant/10 hover:border-outline-variant/30"
                onClick={() => onNavigate(mod.path)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <span className="material-symbols-outlined text-primary text-xl">
                      {mod.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {bankBalanceModal && (
        <Modal
          title={`Saldo bancário · ${formatMonthLabel(month)}`}
          onClose={() => setBankBalanceModal(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Informe o saldo inicial de{' '}
              <span className="font-bold capitalize">{formatMonthLabel(month)}</span>. O saldo
              exibido no Dashboard soma a ele as baixas de contas a receber e desconta as baixas de
              contas a pagar, os abastecimentos no vencimento e os repasses a terceiros. Para
              corrigir meses anteriores, use o histórico de saldo bancário no Dashboard.
            </p>
            <CurrencyInput
              label="Saldo inicial do mês"
              value={bankBalanceInput}
              onChange={setBankBalanceInput}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setBankBalanceModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveBankBalance}>Salvar saldo</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
