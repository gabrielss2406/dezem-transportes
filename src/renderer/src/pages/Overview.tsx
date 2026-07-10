interface OverviewProps {
  user?: string
  onNavigate: (path: string, state?: any) => void
}

const sections = [
  {
    title: 'Operações',
    modules: [
      { title: 'Viagens', icon: 'route', path: '/trips' },
      { title: 'Manutenção', icon: 'build', path: '/maintenance' },
      { title: 'Custos', icon: 'payments', path: '/costs' },
    ],
  },
  {
    title: 'Cadastros',
    modules: [
      { title: 'Frota', icon: 'local_shipping', path: '/trucks' },
      { title: 'Motoristas', icon: 'badge', path: '/drivers' },
      { title: 'Produtos', icon: 'inventory_2', path: '/products' },
      { title: 'Clientes', icon: 'group', path: '/customers' },
      { title: 'Fornecedores', icon: 'handshake', path: '/suppliers' },
      { title: 'Terceirizados', icon: 'group_add', path: '/contractors' },
    ],
  },
  {
    title: 'Financeiro',
    modules: [
      { title: 'Dashboard', icon: 'analytics', path: '/' },
      { title: 'Tabela de Preços', icon: 'request_quote', path: '/prices' },
    ],
  },
  {
    title: 'Sistema',
    modules: [{ title: 'Configurações', icon: 'settings', path: '/settings' }],
  },
]

export function OverviewPage({ user, onNavigate }: OverviewProps) {
  return (
    <div className="p-12 max-w-7xl mx-auto">
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
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
