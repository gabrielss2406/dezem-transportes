import { ipcMain } from 'electron'
import { getAppSettings, saveAppSettings } from './app-settings'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get-app', () => {
    return getAppSettings()
  })

  ipcMain.handle('settings:save-app', (_, data: unknown) => {
    saveAppSettings(data as any)
    return { ok: true }
  })
}
