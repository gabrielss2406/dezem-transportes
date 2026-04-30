import { invoke } from '@tauri-apps/api/core'

export function setupTauriApi() {
  ;(window as any).api = {
    auth: {
      login: (password: string) => invoke('auth_login', { password }),
      changePassword: (current: string, next: string) =>
        invoke('auth_change_password', { current, next }),
    },
    customers: {
      list: (search?: string) => invoke('customers_list', { search }),
      create: (data: any) => invoke('customers_create', { data }),
      update: (id: number, data: any) => invoke('customers_update', { id, data }),
      delete: (id: number) => invoke('customers_delete', { id }),
    },
    products: {
      list: (search?: string) => invoke('products_list', { search }),
      create: (data: any) => invoke('products_create', { data }),
      update: (id: number, data: any) => invoke('products_update', { id, data }),
      delete: (id: number) => invoke('products_delete', { id }),
    },
    suppliers: {
      list: (search?: string) => invoke('suppliers_list', { search }),
      create: (data: any) => invoke('suppliers_create', { data }),
      update: (id: number, data: any) => invoke('suppliers_update', { id, data }),
      delete: (id: number) => invoke('suppliers_delete', { id }),
    },
    trucks: {
      list: () => invoke('trucks_list'),
      create: (data: any) => invoke('trucks_create', { data }),
      update: (id: number, data: any) => invoke('trucks_update', { id, data }),
      delete: (id: number) => invoke('trucks_delete', { id }),
    },
    drivers: {
      list: () => invoke('drivers_list'),
      create: (data: any) => invoke('drivers_create', { data }),
      update: (id: number, data: any) => invoke('drivers_update', { id, data }),
      delete: (id: number) => invoke('drivers_delete', { id }),
    },
    routes: {
      list: () => invoke('routes_list'),
      create: (data: any) => invoke('routes_create', { data }),
    },
    trips: {
      list: (filters?: any) => invoke('trips_list', { filters: filters || {} }),
      create: (data: any) => invoke('trips_create', { data }),
      delete: (id: number) => invoke('trips_delete', { id }),
    },
    costs: {
      list: (filters?: any) => invoke('costs_list', { filters: filters || {} }),
      create: (data: any) => invoke('costs_create', { data }),
      delete: (id: number) => invoke('costs_delete', { id }),
      issueMonthlySalaries: (monthYear: string) =>
        invoke('costs_issue_monthly_salaries', { monthYear }),
    },
    dashboard: {
      summary: (startDate: string, endDate: string) =>
        invoke('dashboard_summary', { startDate, endDate }),
    },
  }
}
