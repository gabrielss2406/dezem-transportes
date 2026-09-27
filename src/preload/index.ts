import { contextBridge, ipcRenderer } from 'electron'
import type { ImageExportData, PdfExportData } from '../shared/types'

// Exposes secure API to the renderer via contextBridge
contextBridge.exposeInMainWorld('api', {
  // Auth
  auth: {
    login: (password: string) => ipcRenderer.invoke('auth:login', password),
    changePassword: (current: string, next: string) =>
      ipcRenderer.invoke('auth:changePassword', current, next),
  },

  // Customers
  customers: {
    list: (search?: string) => ipcRenderer.invoke('customers:list', search),
    create: (data: any) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id),
  },

  // Customer Prices
  customerPrices: {
    listByCustomer: (customerId: number) =>
      ipcRenderer.invoke('customer-prices:listByCustomer', customerId),
    listByProduct: (productId: number) =>
      ipcRenderer.invoke('customer-prices:listByProduct', productId),
    listAll: () => ipcRenderer.invoke('customer-prices:listAll'),
    set: (data: any) => ipcRenderer.invoke('customer-prices:set', data),
    delete: (customerId: number, productId: number) =>
      ipcRenderer.invoke('customer-prices:delete', customerId, productId),
    getPrice: (customerId: number, productId: number) =>
      ipcRenderer.invoke('customer-prices:getPrice', customerId, productId),
  },

  // Products
  products: {
    list: (search?: string) => ipcRenderer.invoke('products:list', search),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
  },

  // Suppliers
  suppliers: {
    list: (search?: string) => ipcRenderer.invoke('suppliers:list', search),
    create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
  },

  // Supplier Types
  'supplier-types': {
    list: () => ipcRenderer.invoke('supplier-types:list'),
    create: (data: any) => ipcRenderer.invoke('supplier-types:create', data),
    delete: (id: number) => ipcRenderer.invoke('supplier-types:delete', id),
  },

  // Cost Categories
  'cost-categories': {
    list: () => ipcRenderer.invoke('cost-categories:list'),
    create: (data: any) => ipcRenderer.invoke('cost-categories:create', data),
    delete: (id: number) => ipcRenderer.invoke('cost-categories:delete', id),
  },

  // Contractors
  contractors: {
    list: (filters?: any) => ipcRenderer.invoke('contractors:list', filters),
    create: (data: any) => ipcRenderer.invoke('contractors:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('contractors:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('contractors:delete', id),
  },

  // Trucks
  trucks: {
    list: (filters?: any) => ipcRenderer.invoke('trucks:list', filters),
    create: (data: any) => ipcRenderer.invoke('trucks:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('trucks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('trucks:delete', id),
  },

  // Drivers
  drivers: {
    list: (filters?: any) => ipcRenderer.invoke('drivers:list', filters),
    create: (data: any) => ipcRenderer.invoke('drivers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('drivers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('drivers:delete', id),
  },

  // Trips
  trips: {
    list: (filters?: any) => ipcRenderer.invoke('trips:list', filters),
    create: (data: any) => ipcRenderer.invoke('trips:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('trips:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('trips:delete', id),
    getFuelStops: (tripId: number) => ipcRenderer.invoke('trips:getFuelStops', tripId),
  },

  // Maintenance
  maintenance: {
    listTypes: (includeInactive?: boolean) =>
      ipcRenderer.invoke('maintenance:listTypes', includeInactive),
    createType: (data: any) => ipcRenderer.invoke('maintenance:createType', data),
    updateType: (id: number, data: any) => ipcRenderer.invoke('maintenance:updateType', id, data),
    deleteType: (id: number) => ipcRenderer.invoke('maintenance:deleteType', id),
    listRecords: (filters?: any) => ipcRenderer.invoke('maintenance:listRecords', filters),
    createRecord: (data: any) => ipcRenderer.invoke('maintenance:createRecord', data),
    deleteRecord: (id: number) => ipcRenderer.invoke('maintenance:deleteRecord', id),
    getStatus: (filters?: any) => ipcRenderer.invoke('maintenance:getStatus', filters),
  },

  // Costs
  costs: {
    list: (filters?: any) => ipcRenderer.invoke('costs:list', filters),
    create: (data: any) => ipcRenderer.invoke('costs:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('costs:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('costs:delete', id),
    markPaid: (data: any) => ipcRenderer.invoke('costs:markPaid', data),
    issueSalaries: (data: { date: string; entries: { driver_id: number; value: number }[] }) =>
      ipcRenderer.invoke('costs:issueSalaries', data),
    salarySummary: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('costs:salarySummary', startDate, endDate),
    byCreditor: (filters?: any) => ipcRenderer.invoke('costs:byCreditor', filters),
  },

  // Fuel Records
  fuel: {
    list: (filters?: any) => ipcRenderer.invoke('fuel:list', filters),
    create: (data: any) => ipcRenderer.invoke('fuel:create', data),
    delete: (id: number) => ipcRenderer.invoke('fuel:delete', id),
    markPaid: (data: any) => ipcRenderer.invoke('fuel:markPaid', data),
  },

  // Oil credit and billing settlements
  oilCredits: {
    listAccounts: () => ipcRenderer.invoke('oilCredits:listAccounts'),
    getAccount: (customerId: number, supplierId?: number) =>
      ipcRenderer.invoke('oilCredits:getAccount', customerId, supplierId),
    addCredit: (data: any) => ipcRenderer.invoke('oilCredits:addCredit', data),
    adjust: (data: any) => ipcRenderer.invoke('oilCredits:adjust', data),
    createSettlement: (data: any) => ipcRenderer.invoke('oilCredits:createSettlement', data),
    updateSettlement: (id: number, data: any) =>
      ipcRenderer.invoke('oilCredits:updateSettlement', id, data),
    listSettlements: (filters?: any) => ipcRenderer.invoke('oilCredits:listSettlements', filters),
    getSettlement: (id: number) => ipcRenderer.invoke('oilCredits:getSettlement', id),
    exportData: (id: number) => ipcRenderer.invoke('oilCredits:exportData', id),
  },

  // Dashboard
  dashboard: {
    summary: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('dashboard:summary', startDate, endDate),
    commissionByDriver: (startDate: string, endDate: string, driverId?: number | string) =>
      ipcRenderer.invoke('dashboard:commissionByDriver', startDate, endDate, driverId),
  },

  // Receivables
  receivables: {
    list: (filters?: any) => ipcRenderer.invoke('receivables:list', filters),
    markPaid: (data: { ids: number[]; paid_date: string }) =>
      ipcRenderer.invoke('receivables:markPaid', data),
    create: (data: any) => ipcRenderer.invoke('receivables:create', data),
    delete: (id: number) => ipcRenderer.invoke('receivables:delete', id),
    summaryByCustomer: () => ipcRenderer.invoke('receivables:summaryByCustomer'),
  },

  // Third-Party Settlements
  thirdPartySettlements: {
    list: (filters?: any) => ipcRenderer.invoke('third-party-settlements:list', filters),
    markSettled: (data: { ids: number[]; settled_date: string }) =>
      ipcRenderer.invoke('third-party-settlements:markSettled', data),
  },

  // Backup
  backup: {
    getConfig: () => ipcRenderer.invoke('backup:getConfig'),
    saveConfig: (config: any) => ipcRenderer.invoke('backup:saveConfig', config),
    clearConfig: () => ipcRenderer.invoke('backup:clearConfig'),
    performBackup: () => ipcRenderer.invoke('backup:performBackup'),
    getStatus: () => ipcRenderer.invoke('backup:getStatus'),
    isEnvConfigured: () => ipcRenderer.invoke('backup:isEnvConfigured'),
    list: () => ipcRenderer.invoke('backup:list'),
    analyze: (key: string) => ipcRenderer.invoke('backup:analyze', key),
    restore: (key: string) => ipcRenderer.invoke('backup:restore', key),
    onStatusUpdate: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status)
      ipcRenderer.on('backup-status-update', listener)
      return () => ipcRenderer.removeListener('backup-status-update', listener)
    },
  },

  // Bank Balances (manual monthly snapshots)
  bankBalances: {
    list: () => ipcRenderer.invoke('bank-balances:list'),
    get: (month: string) => ipcRenderer.invoke('bank-balances:get', month),
    set: (data: { month: string; balance: number }) =>
      ipcRenderer.invoke('bank-balances:set', data),
  },

  // Settings
  settings: {
    getApp: () => ipcRenderer.invoke('settings:get-app'),
    saveApp: (data: unknown) => ipcRenderer.invoke('settings:save-app', data),
    getTripExportFields: (): Promise<string[] | null> =>
      ipcRenderer.invoke('settings:get-trip-export-fields'),
    saveTripExportFields: (fields: string[]) =>
      ipcRenderer.invoke('settings:save-trip-export-fields', fields),
  },

  // PDF
  exportPdf: (data: PdfExportData) => ipcRenderer.invoke('export-pdf', data),

  // Image
  exportImage: (data: ImageExportData) => ipcRenderer.invoke('export-image', data),

  // Cross-window data change notifications (fired after any create/update/delete mutation)
  onDataChanged: (callback: (entity: string) => void) => {
    const listener = (_event: any, entity: string) => callback(entity)
    ipcRenderer.on('data:changed', listener)
    return () => ipcRenderer.removeListener('data:changed', listener)
  },
})
