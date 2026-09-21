import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { appSettingsSchema } from '../../../shared/schemas'
import type { AppSettings } from '../../../shared/types'
import { PageHeader } from '../components/PageHeader'
import { Button, ConfirmModal, Input, Toast, useToast } from '../components/ui'
import { BackupSettings } from './BackupSettings'

const formSchema = z.object({
  label: z.string().min(1, 'O rótulo é obrigatório'),
})
type FormData = z.infer<typeof formSchema>

interface TabItem {
  id: string
  label: string
  icon: string
}

interface SectionProps {
  title: string
  subtitle?: string
  icon?: string
  children: React.ReactNode
}

type TaxFormData = Pick<AppSettings, 'taxRate' | 'commissionRate'>

function Section({ title, subtitle, icon, children }: SectionProps) {
  return (
    <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="material-symbols-outlined text-xl text-primary">{icon}</span>}
        <div className="flex-1">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function TabBar({
  tabs,
  activeTab,
  onChange,
}: { tabs: TabItem[]; activeTab: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-outline-variant/20 mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function DynamicTypeManager({
  title,
  icon,
  api,
}: {
  title: string
  icon: string
  api: {
    list: () => Promise<any[]>
    create: (data: { value: string; label: string }) => Promise<{ id?: number }>
    delete: (id: number) => Promise<{ ok: boolean; error?: string }>
  }
}) {
  const [items, setItems] = useState<any[]>([])
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
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
      <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm">
        <strong>Erro:</strong> A API para "{title}" não foi encontrada. Reinicie a aplicação.
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          <div className="text-left">
            <p className="font-bold text-on-surface text-sm">{title}</p>
            <p className="text-xs text-on-surface-variant">{items.length} itens</p>
          </div>
        </div>
        <span
          className={`material-symbols-outlined transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic p-2">Nenhum item ainda</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-surface-container p-2.5 rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">{item.label}</p>
                    <p className="text-xs text-on-surface-variant font-mono truncate">
                      {item.value}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item.id)}
                    disabled={item.is_deletable === 0}
                    className="ml-2 p-1 text-on-surface-variant rounded disabled:text-outline-variant/30 disabled:cursor-not-allowed hover:text-error enabled:hover:bg-error/10 flex-shrink-0"
                    title={item.is_deletable === 0 ? 'Padrão (não pode ser excluído)' : 'Excluir'}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-outline-variant/20 pt-3">
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
              <Input
                placeholder="Novo item..."
                {...register('label')}
                error={errors.label?.message}
                className="flex-1"
              />
              <Button type="submit" size="sm" className="h-9">
                <span className="material-symbols-outlined">add</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget !== null && (
        <ConfirmModal
          message="Tem certeza que deseja excluir este item?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function TaxSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    taxRate: 0,
    commissionRate: 0,
    bankBalance: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast, show } = useToast()

  const taxRateId = useId()
  const commissionRateId = useId()

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<TaxFormData>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: { taxRate: settings.taxRate, commissionRate: settings.commissionRate },
  })

  useEffect(() => {
    window.api.settings.getApp().then((data) => {
      setSettings(data)
      reset({ taxRate: data.taxRate, commissionRate: data.commissionRate })
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (data: TaxFormData) => {
    try {
      const nextSettings = { ...settings, ...data }
      await window.api.settings.saveApp(nextSettings)
      setSettings(nextSettings)
      show('Configurações salvas com sucesso!')
    } catch (error: any) {
      show(error.message || 'Erro ao salvar.', 'error')
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant text-sm">Carregando...</div>
  }

  return (
    <Section title="Impostos e Comissão" icon="receipt_long">
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
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={errors.taxRate?.message}
              />
            )}
          />
          <p className="text-xs text-on-surface-variant mt-1">Percentual sobre cada viagem</p>
        </div>

        <div>
          <label
            htmlFor={commissionRateId}
            className="block text-sm font-bold text-on-surface mb-2"
          >
            Comissão dos Motoristas (%)
          </label>
          <Controller
            name="commissionRate"
            control={control}
            render={({ field }) => (
              <Input
                id={commissionRateId}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={errors.commissionRate?.message}
              />
            )}
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Percentual aplicado sobre viagens com comissão habilitada
          </p>
        </div>

        <Button type="submit" className="w-full">
          Salvar
        </Button>
      </form>
    </Section>
  )
}

interface SettingsPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function SettingsPage({ theme, onToggleTheme }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('geral')

  const tabs: TabItem[] = [
    { id: 'geral', label: 'Geral', icon: 'settings' },
    { id: 'dados', label: 'Dados Mestres', icon: 'storage' },
    { id: 'backup', label: 'Backup', icon: 'backup' },
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        pretitle="Administração"
        title="Configurações"
        subtitle="Gerencie as configurações do sistema"
      />

      <div className="mt-10">
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* ABA: GERAL */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <Section title="Tema e Aparência" icon="palette">
              <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
                <div>
                  <p className="font-bold text-on-surface">Modo Escuro</p>
                  <p className="text-xs text-on-surface-variant">
                    Atualmente: {theme === 'dark' ? 'Ativado' : 'Desativado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                >
                  {theme === 'dark' ? 'Claro' : 'Escuro'}
                </button>
              </div>
            </Section>

            <TaxSettings />
          </div>
        )}

        {/* ABA: DADOS MESTRES */}
        {activeTab === 'dados' && (
          <div className="space-y-6">
            <DynamicTypeManager
              title="Tipos de Fornecedor"
              icon="business"
              api={window.api['supplier-types']}
            />
            <DynamicTypeManager
              title="Plano de Contas"
              icon="category"
              api={window.api['cost-categories']}
            />
          </div>
        )}

        {/* ABA: BACKUP */}
        {activeTab === 'backup' && (
          <div>
            <BackupSettings />
          </div>
        )}
      </div>
    </div>
  )
}
