import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { backupConfigSchema } from '../../../shared/schemas'
import type { BackupConfig, BackupStatus } from '../../../shared/types'
import { Button, Input, Toast, useToast } from '../components/ui'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function BackupSettings() {
  const [activeTab, setActiveTab] = useState<'config' | 'restore'>('config')
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [configState, setConfigState] = useState<{ isEnv: boolean; isDb: boolean }>({
    isEnv: false,
    isDb: false,
  })
  const [isOverriding, setIsOverriding] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null)
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BackupConfig>({
    resolver: zodResolver(backupConfigSchema),
  })

  const loadData = useCallback(async () => {
    try {
      const state = await window.api.backup.isEnvConfigured()
      setConfigState(state)

      const config = await window.api.backup.getConfig()
      if (config) {
        reset(config)
      }
      const currentStatus = await window.api.backup.getStatus()
      setStatus(currentStatus)
    } catch (error) {
      console.error('Erro ao carregar dados de backup:', error)
    }
  }, [reset])

  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true)
    try {
      const list = await window.api.backup.list()
      setBackups(list)
    } catch (error: any) {
      show(error.message || 'Erro ao carregar lista de backups', 'error')
    } finally {
      setIsLoadingBackups(false)
    }
  }, [show])

  useEffect(() => {
    loadData()
    const removeListener = window.api.backup.onStatusUpdate((newStatus: BackupStatus) => {
      setStatus(newStatus)
    })
    return () => removeListener()
  }, [loadData])

  useEffect(() => {
    if (activeTab === 'restore') {
      loadBackups()
    }
  }, [activeTab, loadBackups])

  const onSave = async (data: BackupConfig) => {
    try {
      await window.api.backup.saveConfig(data)
      show('Configurações de backup salvas!')
      setIsOverriding(false)
      loadData()
    } catch (error: any) {
      show(error.message || 'Erro ao salvar configurações', 'error')
    }
  }

  const onClearConfig = async () => {
    try {
      await window.api.backup.clearConfig()
      show('Voltando para configurações do sistema.')
      loadData()
    } catch (error: any) {
      show(error.message || 'Erro ao limpar configurações', 'error')
    }
  }

  const onBackupNow = async () => {
    setIsBackingUp(true)
    try {
      const result = await window.api.backup.performBackup()
      if (result.ok) {
        show('Backup concluído com sucesso!')
        if (activeTab === 'restore') {
          loadBackups()
        }
      } else {
        show(result.error || 'Erro ao realizar backup', 'error')
      }
    } catch (error: any) {
      show(error.message || 'Erro ao realizar backup', 'error')
    } finally {
      setIsBackingUp(false)
    }
  }

  const [analysisData, setAnalysisData] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const onAnalyzeBackup = async (key: string) => {
    setIsAnalyzing(true)
    try {
      const analysis = await window.api.backup.analyze(key)
      setAnalysisData(analysis)
    } catch (error: any) {
      show(error.message || 'Erro ao analisar backup', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onRestore = async () => {
    if (!restoreTarget) {
      return
    }
    try {
      show('Iniciando restauração... O sistema irá reiniciar.')
      await window.api.backup.restore(restoreTarget)
    } catch (error: any) {
      show(error.message || 'Erro ao restaurar backup', 'error')
      setRestoreTarget(null)
      setAnalysisData(null)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return 'Nunca'
    }
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    return `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <Section title="Backup Cloud (R2)">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex gap-2 p-1 bg-surface-container rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            activeTab === 'config'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Configurações
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            activeTab === 'restore'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Restaurar
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="space-y-6">
          {configState.isEnv && !configState.isDb && !isOverriding ? (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-6">
              <div className="flex items-center gap-3 text-primary mb-2">
                <span className="material-symbols-outlined">settings_suggest</span>
                <p className="font-bold">Configurado via Sistema</p>
              </div>
              <p className="text-sm text-on-surface-variant">
                As credenciais do Cloudflare R2 estão pré-configuradas internamente no projeto.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setIsOverriding(true)}
              >
                Sobrescrever Credenciais
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <Input
                label="Endpoint (S3 URL)"
                placeholder="https://<account-id>.r2.cloudflarestorage.com"
                {...register('endpoint')}
                error={errors.endpoint?.message}
              />
              <Input
                label="Bucket"
                placeholder="Ex: dezem-backups"
                {...register('bucket')}
                error={errors.bucket?.message}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Access Key ID"
                  type="password"
                  {...register('accessKeyId')}
                  error={errors.accessKeyId?.message}
                />
                <Input
                  label="Secret Access Key"
                  type="password"
                  {...register('secretAccessKey')}
                  error={errors.secretAccessKey?.message}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">
                  Salvar
                </Button>
                {(configState.isDb || isOverriding) && configState.isEnv && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      onClearConfig()
                      setIsOverriding(false)
                    }}
                  >
                    Usar Padrão
                  </Button>
                )}
                {isOverriding && !configState.isDb && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setIsOverriding(false)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          )}

          <div className="border-t border-outline-variant/10 pt-6">
            <Button
              type="button"
              variant={configState.isEnv || configState.isDb ? 'primary' : 'ghost'}
              onClick={onBackupNow}
              disabled={isBackingUp}
              className={`w-full ${status && !status.ok ? 'bg-error/10 text-error border-error' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {isBackingUp ? 'sync' : 'cloud_upload'}
                </span>
                <span>{isBackingUp ? 'Processando...' : 'Fazer Backup Agora'}</span>
              </div>
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'restore' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Backups Disponíveis
            </h3>
            <button
              type="button"
              onClick={loadBackups}
              className="text-primary hover:text-primary/80 transition-colors"
              title="Atualizar lista"
            >
              <span
                className={`material-symbols-outlined text-lg ${isLoadingBackups ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {isLoadingBackups && backups.length === 0 && (
              <p className="text-center py-8 text-sm text-on-surface-variant animate-pulse">
                Carregando backups...
              </p>
            )}
            {!isLoadingBackups && backups.length === 0 && (
              <p className="text-center py-8 text-sm text-on-surface-variant italic">
                Nenhum backup encontrado no R2.
              </p>
            )}
            {backups.map((b) => (
              <div
                key={b.key}
                className="bg-surface-container p-4 rounded-xl border border-outline-variant/5 hover:border-primary/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-surface-container-high rounded-lg text-primary">
                    <span className="material-symbols-outlined">database</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {new Date(b.lastModified).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tight">
                      {formatSize(b.size)} • ZIP
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isAnalyzing}
                  onClick={() => {
                    setRestoreTarget(b.key)
                    onAnalyzeBackup(b.key)
                  }}
                >
                  {isAnalyzing ? 'Analisando...' : 'Restaurar'}
                </Button>
              </div>
            ))}
          </div>

          <div className="p-4 bg-error-container/10 border border-error/20 rounded-lg mt-4">
            <div className="flex gap-3 text-error">
              <span className="material-symbols-outlined text-lg">warning</span>
              <p className="text-[11px] font-medium leading-tight">
                A restauração substituirá todos os dados atuais. Certifique-se de que este é o
                arquivo correto antes de prosseguir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-outline-variant/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Último Status
          </span>
          {status && (
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                status.ok
                  ? 'bg-tertiary-container/30 text-tertiary'
                  : 'bg-error-container/30 text-error'
              }`}
            >
              {status.ok ? 'SUCESSO' : 'FALHA'}
            </span>
          )}
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
          <p className="text-sm text-on-surface">
            Sincronizado em: <span className="font-bold">{formatDate(status?.timestamp)}</span>
          </p>
          {status && !status.ok && (
            <p className="text-xs text-error font-medium mt-2 leading-relaxed">
              Erro: {status.error || 'Falha de conexão ou internet.'}
            </p>
          )}
        </div>
      </div>

      {restoreTarget && analysisData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-outline-variant/10 sticky top-0 bg-surface">
              <h3 className="text-lg font-bold text-on-surface">Análise do Backup</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                {new Date(
                  backups.find((b) => b.key === restoreTarget)?.lastModified,
                ).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
                {[
                  { label: 'Viagens', value: analysisData.stats.trips, icon: 'directions_car' },
                  { label: 'Custos', value: analysisData.stats.costs, icon: 'attach_money' },
                  { label: 'Motoristas', value: analysisData.stats.drivers, icon: 'person' },
                  { label: 'Caminhões', value: analysisData.stats.trucks, icon: 'local_shipping' },
                  { label: 'Clientes', value: analysisData.stats.customers, icon: 'business' },
                  { label: 'Produtos', value: analysisData.stats.products, icon: 'inventory_2' },
                  { label: 'Fornecedores', value: analysisData.stats.suppliers, icon: 'store' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface-container p-3 rounded-lg text-center">
                    <div className="text-primary text-xl mb-1">
                      <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                    </div>
                    <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-tight">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Avisos */}
              {analysisData.warnings.length > 0 && (
                <div className="bg-warning-container/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex gap-3 text-warning mb-3">
                    <span className="material-symbols-outlined text-lg">info</span>
                    <p className="font-bold text-sm">Informações Importantes</p>
                  </div>
                  <ul className="text-[12px] text-on-surface-variant space-y-2 ml-6">
                    {analysisData.warnings.map((w: string) => (
                      <li key={w} className="list-disc">
                        {w}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-on-surface-variant mt-3 italic">
                    Essas colunas serão recriadas automaticamente durante a restauração.
                  </p>
                </div>
              )}

              {/* Confirmação */}
              <div className="bg-error-container/10 border border-error/20 rounded-lg p-4">
                <div className="flex gap-3 text-error">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <p className="text-[11px] font-medium leading-tight">
                    A restauração substituirá todos os dados atuais. Esta ação não pode ser
                    desfeita.
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-outline-variant/10">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setRestoreTarget(null)
                    setAnalysisData(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-error hover:bg-error/90"
                  onClick={onRestore}
                >
                  <span className="material-symbols-outlined">restore</span>
                  <span>Restaurar Agora</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}
