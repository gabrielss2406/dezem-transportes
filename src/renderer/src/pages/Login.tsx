import { useState } from 'react'
import { Input, Button } from '../components/ui'

interface LoginProps {
  onLogin: (nome: string) => void
}

export function LoginPage({ onLogin }: LoginProps) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const result = await window.api.auth.login(senha)
      if (result.ok) {
        onLogin(result.nome!)
      } else {
        setErro(result.error || 'Senha incorreta')
      }
    } catch {
      setErro('Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0ea] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2a1f14]">Dezem</h1>
          <p className="text-[#9e8c75] text-sm mt-1">Sistema de Gestão de Frota</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Senha de acesso"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            autoFocus
            error={erro}
          />
          <Button type="submit" disabled={loading || !senha}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-xs text-center text-[#9e8c75] mt-6">
          Senha padrão: <code>dezem2024</code>
        </p>
      </div>
    </div>
  )
}
