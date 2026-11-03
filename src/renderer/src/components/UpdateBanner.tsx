import { useEffect, useState } from 'react'
import type { UpdateStatus } from '../../../shared/types'

function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  useEffect(() => {
    window.api.updater.getStatus().then(setStatus)
    return window.api.updater.onStatus(setStatus)
  }, [])
  return status
}

export function UpdateBanner() {
  const status = useUpdater()
  const [dismissed, setDismissed] = useState<string | null>(null)

  if (
    status.state !== 'available' &&
    status.state !== 'downloading' &&
    status.state !== 'downloaded'
  ) {
    return null
  }
  if (status.state === 'available' && dismissed === status.version) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-outline-variant/20 bg-surface-container-high p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-primary">system_update</span>
        <div className="flex-1 space-y-2">
          {status.state === 'available' && (
            <>
              <p className="text-sm font-bold text-on-surface">
                Nova versão {status.version} disponível
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.api.updater.download()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90"
                >
                  Baixar
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(status.version)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container"
                >
                  Depois
                </button>
              </div>
            </>
          )}
          {status.state === 'downloading' && (
            <>
              <p className="text-sm font-bold text-on-surface">Baixando... {status.percent}%</p>
              <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${status.percent}%` }}
                />
              </div>
            </>
          )}
          {status.state === 'downloaded' && (
            <>
              <p className="text-sm font-bold text-on-surface">
                Versão {status.version} pronta para instalar
              </p>
              <button
                type="button"
                onClick={() => window.api.updater.install()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90"
              >
                Reiniciar e instalar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function UpdateSettings() {
  const status = useUpdater()
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.api.updater.getVersion().then(setVersion)
  }, [])

  const message =
    status.state === 'checking'
      ? 'Verificando...'
      : status.state === 'not-available'
        ? 'Você já está na versão mais recente.'
        : status.state === 'available'
          ? `Nova versão ${status.version} disponível.`
          : status.state === 'downloading'
            ? `Baixando ${status.percent}%`
            : status.state === 'downloaded'
              ? `Versão ${status.version} pronta para instalar.`
              : status.state === 'error'
                ? status.message
                : ''

  return (
    <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-xl text-primary">system_update</span>
        <h3 className="text-base font-bold text-on-surface">Atualizações</h3>
      </div>
      <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
        <div>
          <p className="font-bold text-on-surface">Versão atual: {version}</p>
          {message && <p className="text-xs text-on-surface-variant">{message}</p>}
        </div>
        <button
          type="button"
          disabled={status.state === 'checking' || status.state === 'downloading'}
          onClick={() => window.api.updater.check()}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Verificar atualizações
        </button>
      </div>
    </div>
  )
}
