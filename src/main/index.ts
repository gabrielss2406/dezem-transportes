import { join } from 'path'
import { BrowserWindow, app, shell } from 'electron'
import { setupDatabase } from './database'
import { registerAuthHandlers } from './modules/auth/auth.handlers'
import { registerContractorHandlers } from './modules/contractors/contractors.handlers'
import { registerCostCategoryHandlers } from './modules/cost-categories/cost-categories.handlers'
import { registerCostHandlers } from './modules/costs/costs.handlers'
import { registerCustomerPricesHandlers } from './modules/customer-prices/customer-prices.handlers'
import { registerCustomerHandlers } from './modules/customers/customers.handlers'
import { registerDashboardHandlers } from './modules/dashboard/dashboard.handlers'
import { registerDriverHandlers } from './modules/drivers/drivers.handlers'
import { registerProductHandlers } from './modules/products/products.handlers'
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
  registerSupplierHandlers()
  registerSupplierTypesHandlers()
  registerTripHandlers()
  registerTruckHandlers()

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
