import { BrowserWindow, app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../../../shared/types'

let status: UpdateStatus = { state: 'idle' }
let targetVersion = ''

function setStatus(next: UpdateStatus): void {
  status = next
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('updater:status', status)
    }
  }
}

export function registerUpdaterHandlers(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    targetVersion = info.version
    setStatus({ state: 'available', version: info.version })
  })
  autoUpdater.on('update-not-available', () => setStatus({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    setStatus({ state: 'downloading', version: targetVersion, percent: Math.round(p.percent) }),
  )
  autoUpdater.on('update-downloaded', (info) =>
    setStatus({ state: 'downloaded', version: info.version }),
  )
  autoUpdater.on('error', (err) => setStatus({ state: 'error', message: err.message }))

  ipcMain.handle('updater:get-version', () => app.getVersion())
  ipcMain.handle('updater:get-status', () => status)
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      setStatus({ state: 'error', message: 'Atualizações só funcionam no app instalado.' })
      return
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // o evento 'error' já informa a UI
    }
  })
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch {
      // o evento 'error' já informa a UI
    }
  })
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

/** Checagem automática ao abrir o app (apenas empacotado). */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    return
  }
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)
}
