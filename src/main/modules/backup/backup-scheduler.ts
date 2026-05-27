import type { BrowserWindow } from 'electron'
import cron from 'node-cron'
import { getBackupConfig, getBackupStatus } from './backup-config'
import { performBackup } from './backup-service'

export function startBackupScheduler(win: BrowserWindow) {
  // Roda toda Segunda-feira às 2:00 AM
  // Formato: minute hour dayOfMonth month dayOfWeek
  cron.schedule('0 2 * * 1', async () => {
    if (getBackupConfig()) {
      try {
        await performBackup()
        const status = getBackupStatus()
        win.webContents.send('backup-status-update', status)
      } catch (e) {
        const status = getBackupStatus()
        win.webContents.send('backup-status-update', status)
      }
    }
  })
}
