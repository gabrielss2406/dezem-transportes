import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '../components/PageHeader'
import { Button, Input, Toast, useToast } from '../components/ui'

interface SupplierType {
  id: number
  value: string
  label: string
}

const formSchema = z.object({
  label: z.string().min(1, 'O rótulo é obrigatório'),
})

type FormData = z.infer<typeof formSchema>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface SettingsPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function SettingsPage({ theme, onToggleTheme }: SettingsPageProps) {
  const [types, setTypes] = useState<SupplierType[]>([])
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { label: '' },
  })

  const load = useCallback(() => {
    window.api['supplier-types'].list().then(setTypes)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onSubmit = async ({ label }: FormData) => {
    const value = label.toLowerCase().replace(/\s+/g, '_')
    try {
      const result = await window.api['supplier-types'].create({ value, label })
      if (result.id) {
        show('Tipo de fornecedor adicionado!')
        reset()
        load()
      } else {
        show('Erro ao adicionar tipo. Verifique se o valor já existe.', 'error')
      }
    } catch (error: any) {
      show(error.message || 'Erro desconhecido.', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este tipo?')) return
    try {
      const result = await window.api['supplier-types'].delete(id)
      if (result.ok) {
        show('Tipo de fornecedor excluído!')
        load()
      } else {
        show(result.error || 'Erro ao excluir tipo.', 'error')
      }
    } catch (error: any) {
      show(error.message || 'Erro desconhecido.', 'error')
    }
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <PageHeader
        pretitle="Administração"
        title="Configurações"
        subtitle="Ajuste as configurações gerais do sistema."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10 items-start">
        {/* Coluna 1: Tipos de Fornecedor */}
        <Section title="Tipos de Fornecedor">
          <div className="space-y-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between bg-surface-container p-3 rounded-lg"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">{type.label}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{type.value}</p>
                </div>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-2 text-on-surface-variant hover:text-error rounded-full hover:bg-error/10"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 pt-6">
            <p className="text-sm font-bold text-on-surface mb-3">Adicionar Novo Tipo</p>
            <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-4">
              <Input
                placeholder="Rótulo (ex: Novo Tipo)"
                {...register('label')}
                error={errors.label?.message}
                className="flex-1"
              />
              <Button type="submit" size="sm" className="h-11">
                Adicionar
              </Button>
            </form>
          </div>
        </Section>

        {/* Coluna 2: Tema e Outras Configs */}
        <Section title="Tema e Aparência">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-on-surface">Tema</p>
              <p className="text-on-surface-variant text-sm capitalize">
                Atualmente: {theme === 'dark' ? 'Escuro' : 'Claro'}
              </p>
            </div>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-3 px-5 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>Mudar para tema {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}
