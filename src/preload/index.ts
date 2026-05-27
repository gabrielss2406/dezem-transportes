import { contextBridge, ipcRenderer } from 'electron'

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

  // Costs
  costs: {
    list: (filters?: any) => ipcRenderer.invoke('costs:list', filters),
    create: (data: any) => ipcRenderer.invoke('costs:create', data),
    delete: (id: number) => ipcRenderer.invoke('costs:delete', id),
    issueMonthlySalaries: (monthYear: string) =>
      ipcRenderer.invoke('costs:issueMonthlySalaries', monthYear),
  },

  // Dashboard
  dashboard: {
    summary: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('dashboard:summary', startDate, endDate),
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
    restore: (key: string) => ipcRenderer.invoke('backup:restore', key),
    onStatusUpdate: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status)
      ipcRenderer.on('backup-status-update', listener)
      return () => ipcRenderer.removeListener('backup-status-update', listener)
    },
  },
})
