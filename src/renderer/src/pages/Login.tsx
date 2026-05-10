import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { loginSchema } from '../../../shared/schemas'

interface LoginProps {
  onLogin: (name: string) => void
}

export function LoginPage({ onLogin }: LoginProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<{ password: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
    mode: 'all',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: { password: string }) => {
    setLoading(true)
    setError('')
    try {
      const result = await window.api.auth.login(data.password)
      if (result.ok && result.name) {
        onLogin(result.name)
        reset()
      } else {
        setError(result.error || 'Senha incorreta')
      }
    } catch {
      setError('Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-md flex-1 flex items-center justify-center">
        <div className="w-full">
          {/* Branding */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center bg-primary-container p-3 rounded-xl mb-6">
              <span className="material-symbols-outlined text-on-primary text-4xl">
                local_shipping
              </span>
            </div>
            <h1 className="text-3xl font-black text-on-background tracking-tight mb-2">
              Dezem Transportes
            </h1>
            <p className="text-on-surface-variant font-medium">
              Gestão de Frota e Logística de Precisão
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface-container-lowest rounded-xl p-10 shadow-2xl shadow-primary/5 border border-outline-variant/10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Username (display only — auth uses password) */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-bold text-on-surface tracking-wide uppercase"
                >
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">person</span>
                  </div>
                  <input
                    id="username"
                    type="text"
                    defaultValue="Admin"
                    readOnly
                    className="block w-full pl-10 pr-3 py-4 bg-surface-container-highest border-0 border-b-2 border-transparent outline-none font-medium text-on-surface-variant cursor-default"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-on-surface tracking-wide uppercase"
                >
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">lock</span>
                  </div>
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-4 bg-surface-container-highest border-0 border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest transition-all duration-200 outline-none font-medium"
                  />
                </div>
                {(error || errors.password?.message) && (
                  <p className="text-error text-sm font-medium pt-1">
                    {error || errors.password?.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !watch('password')}
                  className="w-full py-4 px-6 bg-gradient-to-b from-primary to-primary-container text-on-primary font-bold text-lg rounded-lg shadow-sm hover:scale-[0.98] active:scale-95 transition-transform duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                  {!loading && (
                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Supporting icons */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { icon: 'shield', label: 'Seguro' },
              { icon: 'speed', label: 'Rápido' },
              { icon: 'support_agent', label: 'Suporte' },
            ].map(({ icon, label }) => (
              <div
                key={icon}
                className="text-center p-4 bg-surface-container-high rounded-lg opacity-60"
              >
                <span className="material-symbols-outlined text-primary mb-1 block">{icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest block">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-4 w-full py-8">
        {/* <div className="flex gap-8">
          {['Privacidade', 'Termos', 'Contato'].map((link) => (
            <a
              key={link}
              href="/"
              className="text-sm text-on-surface opacity-40 hover:opacity-100 transition-opacity"
            >
              {link}
            </a>
          ))}
        </div> */}
        <p className="text-sm text-primary">© Dezem Transportes - Excelência em Logística</p>
      </footer>
    </div>
  )
}
