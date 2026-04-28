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

  // Trucks
  trucks: {
    list: () => ipcRenderer.invoke('trucks:list'),
    create: (data: any) => ipcRenderer.invoke('trucks:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('trucks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('trucks:delete', id),
  },

  // Drivers
  drivers: {
    list: () => ipcRenderer.invoke('drivers:list'),
    create: (data: any) => ipcRenderer.invoke('drivers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('drivers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('drivers:delete', id),
  },

  // Routes
  routes: {
    list: () => ipcRenderer.invoke('routes:list'),
    create: (data: any) => ipcRenderer.invoke('routes:create', data),
  },

  // Trips
  trips: {
    list: (filters?: any) => ipcRenderer.invoke('trips:list', filters),
    create: (data: any) => ipcRenderer.invoke('trips:create', data),
    delete: (id: number) => ipcRenderer.invoke('trips:delete', id),
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
})
