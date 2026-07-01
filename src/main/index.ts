import fs from 'fs'
import { join } from 'path'
import path from 'path'
import { BrowserWindow, app, ipcMain, shell } from 'electron'

import type { PdfExportData } from '../shared/types' // Adicionar import de PdfExportData
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
import { registerProductHandlers } from './modules/products/products.handlers'
import { registerSettingsHandlers } from './modules/settings/settings.handlers'
import { registerSupplierTypesHandlers } from './modules/supplier-types/supplier-types.handlers'
import { registerSupplierHandlers } from './modules/suppliers/suppliers.handlers'
import { registerTripHandlers } from './modules/trips/trips.handlers'
import { registerTruckHandlers } from './modules/trucks/trucks.handlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Dezem — Gestão de Frota',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  startBackupScheduler(mainWindow)
}

app.whenReady().then(() => {
  setupDatabase()
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
  registerTripHandlers()
  registerTruckHandlers()
  registerBackupHandlers()

  // Handler para exportação de PDF
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
