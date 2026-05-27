import { ipcMain } from 'electron'
import {
  clearBackupConfig,
  getBackupConfig,
  getBackupStatus,
  saveBackupConfig,
} from './backup-config'
import { listBackups, performBackup, restoreBackup } from './backup-service'

export function registerBackupHandlers() {
  ipcMain.handle('backup:getConfig', () => getBackupConfig())
  ipcMain.handle('backup:saveConfig', (_, config) => saveBackupConfig(config))
  ipcMain.handle('backup:clearConfig', () => clearBackupConfig())
  ipcMain.handle('backup:getStatus', () => getBackupStatus())

  ipcMain.handle('backup:isEnvConfigured', () => {
    const env = process.env
    const isEnv = !!(
      env.MAIN_VITE_R2_ENDPOINT &&
      env.MAIN_VITE_R2_BUCKET &&
      env.MAIN_VITE_R2_ACCESS_KEY_ID &&
      env.MAIN_VITE_R2_SECRET_ACCESS_KEY
    )

    // Verificar se existe config no banco (sobrescrita)
    const config = getBackupConfig()
    const isDb = !!config && !isEnv // Simplificação: se getBackupConfig retornar algo mas isEnv é falso, ou se as credenciais forem diferentes.

    // Uma forma melhor: verificar se existe a chave no banco diretamente
    // Mas para o frontend, basta saber se deve mostrar o botão "Sobrescrever" ou "Voltar ao padrão"
    return { isEnv, isDb: !!config }
  })

  ipcMain.handle('backup:performBackup', async (event) => {
    try {
      await performBackup()
      const status = getBackupStatus()
      event.sender.send('backup-status-update', status)
      return { ok: true }
    } catch (error: any) {
      const status = getBackupStatus()
      event.sender.send('backup-status-update', status)
      return { ok: false, error: error.message }
    }
  })

  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:restore', (_, key: string) => restoreBackup(key))
}
