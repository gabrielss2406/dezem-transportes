import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { CostsPage } from './pages/Costs'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { CustomersPage } from './pages/records/Customers'
import { DriversPage } from './pages/records/Drivers'
import { ProductsPage } from './pages/records/Products'
import { SuppliersPage } from './pages/records/Suppliers'
import { TrucksPage } from './pages/records/Trucks'
import { TripsPage } from './pages/Trips'

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
