import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/trips', label: 'Viagens', icon: '🚛' },
  { path: '/costs', label: 'Custos', icon: '💰' },
  { path: '/trucks', label: 'Caminhões', icon: '🚚' },
  { path: '/drivers', label: 'Motoristas', icon: '👤' },
  { path: '/customers', label: 'Clientes', icon: '🏢' },
  { path: '/products', label: 'Produtos', icon: '📦' },
  { path: '/suppliers', label: 'Fornecedores', icon: '🏪' }
]

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-[#1a1208] flex flex-col py-6 px-3">
      <div className="px-3 mb-8">
        <h1 className="text-white font-bold text-lg leading-tight">Dezem</h1>
        <p className="text-[#9e8c75] text-xs mt-0.5">Gestão de Frota</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#7B5B2E] text-white font-semibold'
                  : 'text-[#c4b49a] hover:bg-[#2a1f14] hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 text-[#4a3419] text-xs">
        v1.0.0
      </div>
    </aside>
  )
}
