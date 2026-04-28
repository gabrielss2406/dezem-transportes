import { useState } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { ViagensPage } from './pages/Viagens'
import { CustosPage } from './pages/Custos'
import { CaminhoesPage, MotoristasPage, ClientesPage, ProdutosPage, FornecedoresPage } from './pages/Cadastros'

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
            <Route path="/viagens" element={<ViagensPage />} />
            <Route path="/custos" element={<CustosPage />} />
            <Route path="/caminhoes" element={<CaminhoesPage />} />
            <Route path="/motoristas" element={<MotoristasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/produtos" element={<ProdutosPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  )
}
