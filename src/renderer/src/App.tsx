import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { UpdateBanner } from './components/UpdateBanner'
import { CostsPage } from './pages/Costs'
import { DashboardPage } from './pages/Dashboard'
import { DesignSystemPage } from './pages/DesignSystem'
import { LoginPage } from './pages/Login'
import { MaintenancePage } from './pages/Maintenance'
import { OverviewPage } from './pages/Overview'
import { PriceManagementPage } from './pages/PriceManagement'
import { ReceivablesPage } from './pages/Receivables'
import { SettingsPage } from './pages/Settings'
import { ThirdPartySettlementsPage } from './pages/ThirdPartySettlements'
import { TripsPage } from './pages/Trips'
import { ContractorsPage } from './pages/records/Contractors'
import { CustomersPage } from './pages/records/Customers'
import { DriversPage } from './pages/records/Drivers'
import { ProductsPage } from './pages/records/Products'
import { SuppliersPage } from './pages/records/Suppliers'
import { TrucksPage } from './pages/records/Trucks'

function AppRoutes() {
  const [user, setUser] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  })
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  function handleLogout() {
    setUser(null)
    navigate('/')
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={(name) => {
          setUser(name)
          navigate('/overview')
        }}
      />
    )
  }

  return (
    <Routes>
      <Route
        path="*"
        element={
          <div className="flex h-screen bg-surface overflow-hidden">
            <Sidebar onLogout={handleLogout} />
            <UpdateBanner />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route
                  path="/overview"
                  element={
                    <OverviewPage
                      user={user}
                      onNavigate={(path, state) => navigate(path, { state })}
                    />
                  }
                />
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/prices" element={<PriceManagementPage />} />
                <Route path="/costs" element={<CostsPage />} />{' '}
                <Route path="/receivables" element={<ReceivablesPage />} />
                <Route path="/third-party-settlements" element={<ThirdPartySettlementsPage />} />
                <Route path="/trucks" element={<TrucksPage />} />
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/contractors" element={<ContractorsPage />} />
                <Route
                  path="/settings"
                  element={<SettingsPage theme={theme} onToggleTheme={toggleTheme} />}
                />
                <Route path="/design-system" element={<DesignSystemPage />} />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>
  )
}
