import { useState } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { TripsPage } from './pages/Trips'
import { CostsPage } from './pages/Costs'
import { TrucksPage, DriversPage, CustomersPage, ProductsPage, SuppliersPage } from './pages/Records'

export default function App() {
  const [user, setUser] = useState<string | null>(null)

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  return (
    <MemoryRouter>
      <div className="flex min-h-screen bg-[#f5f0ea]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
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
