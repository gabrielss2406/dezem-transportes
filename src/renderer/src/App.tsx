import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { CostsPage } from './pages/Costs'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { OverviewPage } from './pages/Overview'
import { TripsPage } from './pages/Trips'
import { CustomersPage } from './pages/records/Customers'
import { DriversPage } from './pages/records/Drivers'
import { ProductsPage } from './pages/records/Products'
import { SuppliersPage } from './pages/records/Suppliers'
import { TrucksPage } from './pages/records/Trucks'

export default function App() {
  const [user, setUser] = useState<string | null>(null)
  const [showOverview, setShowOverview] = useState(false)
  const [initialPath, setInitialPath] = useState('/')

  if (!user) {
    return (
      <LoginPage
        onLogin={(name) => {
          setUser(name)
          setShowOverview(true)
        }}
      />
    )
  }

  if (showOverview) {
    return (
      <OverviewPage
        onNavigate={(path) => {
          setInitialPath(path)
          setShowOverview(false)
        }}
        onLogout={() => {
          setUser(null)
          setShowOverview(false)
        }}
      />
    )
  }

  function handleLogout() {
    setUser(null)
    setShowOverview(false)
  }

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <div className="flex h-screen bg-surface overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/costs" element={<CostsPage />} />
            <Route path="/trucks" element={<TrucksPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  )
}
