import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/overview', label: 'Menu', icon: 'menu' },
  { path: '/', label: 'Dashboard', icon: 'analytics' },
  { path: '/trucks', label: 'Caminhões', icon: 'local_shipping' },
  { path: '/drivers', label: 'Motoristas', icon: 'badge' },
  { path: '/products', label: 'Produtos', icon: 'inventory_2' },
  { path: '/customers', label: 'Clientes', icon: 'group' },
  { path: '/prices', label: 'Tabela de Preços', icon: 'request_quote' },
  { path: '/suppliers', label: 'Fornecedores', icon: 'handshake' },
  { path: '/contractors', label: 'Terceirizados', icon: 'group_add' },
  { path: '/trips', label: 'Viagens', icon: 'route' },
  { path: '/costs', label: 'Custos', icon: 'payments' },
  { path: '/settings', label: 'Configurações', icon: 'settings' },
]

interface SidebarProps {
  onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  const navigate = useNavigate()

  return (
    <aside className="flex flex-col h-screen w-64 bg-surface-container-lowest border-r border-outline-variant/10 font-headline text-on-surface sticky top-0 shrink-0">
      {/* Brand */}
      <div className="px-6 py-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-xl">
              local_shipping
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-on-surface leading-tight">
              Dezem
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">
              Logística &amp; Transporte
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-4 px-4 py-3.5 rounded-lg text-primary bg-surface-container-highest/40 relative font-bold text-sm border-l-[3px] border-primary transition-all'
                : 'flex items-center gap-4 px-4 py-3.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors group text-sm font-medium'
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-xl"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : {}
                  }
                >
                  {icon}
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-6 mt-auto space-y-3 border-t border-outline-variant/10">
        {/* <Link
          to="/design-system"
          className="flex items-center gap-3 px-2 py-2 w-full text-on-surface-variant hover:text-primary transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-xl opacity-70">palette</span>
          <span>Design System</span>
        </Link> */}
        <button
          type="button"
          onClick={() => navigate('/trips', { state: { openModal: true } })}
          className="w-full py-3 bg-primary text-on-primary font-bold rounded text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          Nova Viagem
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 px-2 py-2 w-full text-on-surface-variant hover:text-on-surface transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-xl opacity-70">logout</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
