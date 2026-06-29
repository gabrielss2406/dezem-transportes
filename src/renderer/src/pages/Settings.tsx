import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { appSettingsSchema } from '../../../shared/schemas'
import type { AppSettings } from '../../../shared/types'
import { PageHeader } from '../components/PageHeader'
import { Button, ConfirmModal, CurrencyInput, Input, Toast, useToast } from '../components/ui'
import { BackupSettings } from './BackupSettings'

// Section component for styling
const formSchema = z.object({
  label: z.string().min(1, 'O rótulo é obrigatório'),
})
type FormData = z.infer<typeof formSchema>

// Section component for styling
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// Generic component to manage dynamic types
function DynamicTypeManager({
  title,
  api,
}: {
  title: string
  api: {
    list: () => Promise<any[]>
    create: (data: { value: string; label: string }) => Promise<{ id?: number }>
    delete: (id: number) => Promise<{ ok: boolean; error?: string }>
  }
}) {
  const [items, setItems] = useState<any[]>([])
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
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
    if (!api) {
      return
    }
    api.list().then(setItems)
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  const onSubmit = async ({ label }: FormData) => {
    if (!api) {
      return
    }
    const value = label.toLowerCase().replace(/\s+/g, '_')
    try {
      const result = await api.create({ value, label })
      if (result.id) {
        show(`${title} adicionado(a)!`)
        reset()
        load()
      } else {
        show(`Erro ao adicionar ${title.toLowerCase()}. Verifique se o valor já existe.`, 'error')
      }
    } catch (error: any) {
      show(error.message || 'Erro desconhecido.', 'error')
    }
  }

  const handleConfirmDelete = async () => {
    if (!api || deleteTarget === null) {
      return
    }
    try {
      const result = await api.delete(deleteTarget)
      if (result.ok) {
        show(`${title} excluído(a)!`)
        load()
      } else {
        show(result.error || `Erro ao excluir ${title.toLowerCase()}.`, 'error')
      }
    } catch (error: any) {
      show(error.message || 'Erro desconhecido.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (!api) {
    return (
      <Section title={title}>
        <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm">
          <strong>Erro:</strong> A API para "{title}" não foi encontrada. Pode ser necessário
          reiniciar a aplicação.
        </div>
      </Section>
    )
  }

  return (
    <Section title={title}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-surface-container p-3 rounded-lg"
          >
            <div>
              <p className="font-bold text-on-surface text-sm">{item.label}</p>
              <p className="text-xs text-on-surface-variant font-mono">{item.value}</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTarget(item.id)}
              disabled={item.is_deletable === 0}
              className="p-2 text-on-surface-variant rounded-full disabled:text-outline-variant/30 disabled:cursor-not-allowed hover:text-error enabled:hover:bg-error/10"
              title={item.is_deletable === 0 ? 'Este item padrão não pode ser excluído' : 'Excluir'}
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-outline-variant/20 pt-6">
        <p className="text-sm font-bold text-on-surface mb-3">Adicionar Novo</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-4">
          <Input
            placeholder="Rótulo..."
            {...register('label')}
            error={errors.label?.message}
            className="flex-1"
          />
          <Button type="submit" size="sm" className="h-11">
            Adicionar
          </Button>
        </form>
      </div>

      {deleteTarget !== null && (
        <ConfirmModal
          message={`Tem certeza que deseja excluir este item de ${title.toLowerCase()}?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Section>
  )
}

function TaxSettings() {
  const [settings, setSettings] = useState<AppSettings>({ taxRate: 0, taxFixed: 0 })
  const [loading, setLoading] = useState(true)
  const { toast, show } = useToast()

  const taxRateId = React.useId()
  const taxFixedId = React.useId()

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<AppSettings>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: settings,
  })

  useEffect(() => {
    window.api.settings.getApp().then((data) => {
      setSettings(data)
      reset(data)
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (data: AppSettings) => {
    try {
      await window.api.settings.saveApp(data)
      setSettings(data)
      show('Configurações de impostos salvas com sucesso!')
    } catch (error: any) {
      show(error.message || 'Erro ao salvar configurações.', 'error')
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant">Carregando...</div>
  }

  return (
    <Section title="Impostos">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor={taxRateId} className="block text-sm font-bold text-on-surface mb-2">
            Alíquota Percentual (%)
          </label>
          <Controller
            name="taxRate"
            control={control}
            render={({ field }) => (
              <Input
                id={taxRateId}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 5 para 5%"
                value={field.value}
                onChange={field.onChange}
                error={errors.taxRate?.message}
              />
            )}
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Percentual aplicado sobre o valor cobrado de cada viagem
          </p>
        </div>

        <div>
          <label htmlFor={taxFixedId} className="block text-sm font-bold text-on-surface mb-2">
            Valor Fixo (R$)
          </label>
          <Controller
            name="taxFixed"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id={taxFixedId}
                placeholder="Ex: 50 para R$ 50,00"
                value={field.value}
                onChange={field.onChange}
                error={errors.taxFixed?.message}
              />
            )}
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Valor fixo em reais aplicado a cada viagem
          </p>
        </div>

        <Button type="submit" className="w-full">
          Salvar Configurações
        </Button>
      </form>
    </Section>
  )
}

// Main Settings Page Component
interface SettingsPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function SettingsPage({ theme, onToggleTheme }: SettingsPageProps) {
  return (
    <div className="p-12 max-w-7xl mx-auto">
      <PageHeader
        pretitle="Administração"
        title="Configurações"
        subtitle="Ajuste as configurações gerais do sistema."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10 items-start">
        <DynamicTypeManager title="Tipos de Fornecedor" api={window.api['supplier-types']} />
        <DynamicTypeManager title="Categorias de Custo" api={window.api['cost-categories']} />
        <TaxSettings />
        <BackupSettings />

        <Section title="Tema e Aparência">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-on-surface">Tema</p>
              <p className="text-on-surface-variant text-sm capitalize">
                Atualmente: {theme === 'dark' ? 'Escuro' : 'Claro'}
              </p>
            </div>
            <button
              type="button"
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
