import { ipcMain } from 'electron'
import { appSettingsSchema } from '../../../shared/schemas'
import { getAppSettings, saveAppSettings } from './app-settings'
import { getTripExportFieldsConfig, saveTripExportFieldsConfig } from './export-settings'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get-app', () => {
    return getAppSettings()
  })

  ipcMain.handle('settings:save-app', (_, data: unknown) => {
    const settings = appSettingsSchema.parse(data)
    saveAppSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('settings:get-trip-export-fields', () => {
    return getTripExportFieldsConfig()
  })

  ipcMain.handle('settings:save-trip-export-fields', (_, fields: string[]) => {
    saveTripExportFieldsConfig(fields)
    return { ok: true }
  })
}
