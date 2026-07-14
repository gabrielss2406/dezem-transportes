import fs from 'fs'
import { join } from 'path'
import path from 'path'
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'

import type { PdfExportData } from '../shared/types'
import { setupDatabase } from './database'
import { registerAuthHandlers } from './modules/auth/auth.handlers'
import { startBackupScheduler } from './modules/backup/backup-scheduler'
import { registerBackupHandlers } from './modules/backup/backup.handlers'
import { registerContractorHandlers } from './modules/contractors/contractors.handlers'
import { registerCostCategoryHandlers } from './modules/cost-categories/cost-categories.handlers'
import { registerCostHandlers } from './modules/costs/costs.handlers'
import { registerCustomerPricesHandlers } from './modules/customer-prices/customer-prices.handlers'
import { registerCustomerHandlers } from './modules/customers/customers.handlers'
import { registerDashboardHandlers } from './modules/dashboard/dashboard.handlers'
import { registerDriverHandlers } from './modules/drivers/drivers.handlers'
import { registerFuelHandlers } from './modules/fuel/fuel.handlers'
import { registerMaintenanceHandlers } from './modules/maintenance/maintenance.handlers'
import { registerProductHandlers } from './modules/products/products.handlers'
import { registerSettingsHandlers } from './modules/settings/settings.handlers'
import { registerSupplierTypesHandlers } from './modules/supplier-types/supplier-types.handlers'
import { registerSupplierHandlers } from './modules/suppliers/suppliers.handlers'
import { registerTripHandlers } from './modules/trips/trips.handlers'
import { registerTruckHandlers } from './modules/trucks/trucks.handlers'
import { createWindow } from './window'

process.on('uncaughtException', (error) => {
  console.error('[Main] Erro não tratado (uncaughtException):', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Rejeição de Promise não tratada (unhandledRejection):', reason)
})

app.whenReady().then(async () => {
  try {
    setupDatabase()
  } catch (error) {
    console.error('[Boot] Falha crítica ao inicializar o banco de dados:', error)
    dialog.showErrorBox(
      'Erro ao iniciar o Dezem Gestão de Frota',
      `Não foi possível inicializar o banco de dados.\n\n${(error as Error).message}\n\nO aplicativo será encerrado.`,
    )
    app.quit()
    return
  }

  registerAuthHandlers()
  registerContractorHandlers()
  registerCostCategoryHandlers()
  registerCostHandlers()
  registerCustomerHandlers()
  registerCustomerPricesHandlers()
  registerDashboardHandlers()
  registerDriverHandlers()
  registerProductHandlers()
  registerSettingsHandlers()
  registerSupplierHandlers()
  registerSupplierTypesHandlers()
  registerFuelHandlers()
  registerMaintenanceHandlers()
  registerTripHandlers()
  registerTruckHandlers()
  registerBackupHandlers()

  ipcMain.handle('export-pdf', async (_event, pdfData: PdfExportData) => {
    try {
      const documentsPath = app.getPath('documents')
      const filePath = path.join(documentsPath, `${pdfData.fileName}.pdf`)

      const buffer = Buffer.from(pdfData.data)

      fs.writeFileSync(filePath, buffer)
      await shell.openPath(filePath)

      return { success: true, path: filePath }
    } catch (error) {
      console.error('Falha ao salvar ou abrir o PDF:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  const win = createWindow()
  startBackupScheduler(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow()
      startBackupScheduler(newWin)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
