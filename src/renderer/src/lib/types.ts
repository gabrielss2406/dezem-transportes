export interface Customer {
  id: number
  customId?: number
  name: string
  cnpj?: string
  ie?: string
  phone?: string
  address?: string
}

export interface Product {
  id: number
  customId?: number
  name: string
  unit: string
}

export interface CustomerPrice {
  customerId: number
  productId: number
  price: number
  customerName?: string
  productName?: string
}

export interface Supplier {
  id: number
  customId?: number
  name: string
  type: 'gas_station' | 'workshop' | 'quarry' | 'other'
  phone?: string
}

export interface Truck {
  id: number
  customId?: number
  license_plate: string
  model: string
  year?: number
  capacity_ton?: number
  current_odometer: number
}

export interface Driver {
  id: number
  customId?: number
  name: string
  cpf?: string
  phone?: string
  monthly_salary: number
  truck_id?: number
  truck_license_plate?: string
  active: number
}

export interface FuelStop {
  id?: number
  trip_id?: number
  supplier_id: number
  supplier_name?: string
  value: number
  liters: number
  km_driven: number
}

export interface Trip {
  id: number
  date: string
  truck_id: number
  driver_id: number
  product_id: number
  customer_id?: number
  supplier_id?: number
  weight_ton: number
  price_charged: number
  km_driven: number
  observation?: string
  fuel_stops?: FuelStop[]
  fuel_stops_count?: number
  // joins
  truck_license_plate?: string
  truck_model?: string
  driver_name?: string
  product_name?: string
  customer_name?: string
}

export interface Cost {
  id: number
  customId?: number
  date: string
  category: 'fuel' | 'oil' | 'maintenance' | 'salary' | 'toll' | 'others'
  value: number
  truck_id?: number
  supplier_id?: number
  driver_id?: number
  description?: string
  // joins
  truck_license_plate?: string
  supplier_name?: string
  driver_name?: string
}

export interface DashboardSummary {
  revenue: number
  cost: number
  profit: number
  totalTrips: number
  totalKm: number
  perTruck: Array<{
    license_plate: string
    model: string
    revenue: number
    km: number
    cost: number
    profit: number
    cpk: number
  }>
  monthlyRevenue: Array<{ month: string; revenue: number }>
  maintenanceAlerts: Array<{
    license_plate: string
    current_odometer: number
    last_maintenance_date: string | null
    km_since_last_maintenance: number
  }>
  perCategory: Array<{ category: string; total: number }>
}

// Augment Window
declare global {
  interface Window {
    api: {
      auth: {
        login(password: string): Promise<{ ok: boolean; name?: string; error?: string }>
        changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }>
      }
      customers: {
        list(search?: string): Promise<Customer[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      customerPrices: {
        listByCustomer(customerId: number): Promise<CustomerPrice[]>
        listByProduct(productId: number): Promise<CustomerPrice[]>
        listAll(): Promise<CustomerPrice[]>
        set(data: { customerId: number; productId: number; price: number }): Promise<{
          ok: boolean
        }>
        delete(customerId: number, productId: number): Promise<{ ok: boolean }>
        getPrice(customerId: number, productId: number): Promise<{ price: number } | undefined>
      }
      products: {
        list(search?: string): Promise<Product[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      suppliers: {
        list(filters?: any): Promise<Supplier[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      'supplier-types': {
        list(): Promise<{ value: string; label: string }[]>
        create(data: any): Promise<{ id: number }>
        delete(id: number): Promise<{ ok: boolean; error?: string }>
      }
      'cost-categories': {
        list(): Promise<{ value: string; label: string }[]>
        create(data: any): Promise<{ id: number }>
        delete(id: number): Promise<{ ok: boolean; error?: string }>
      }
      trucks: {
        list(filters?: any): Promise<Truck[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      drivers: {
        list(filters?: any): Promise<Driver[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      trips: {
        list(filters?: any): Promise<Trip[]>
        create(data: any): Promise<{ id: number }>
        update(id: number, data: any): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
        getFuelStops(tripId: number): Promise<FuelStop[]>
      }
      costs: {
        list(filters?: any): Promise<Cost[]>
        create(data: any): Promise<{ id: number }>
        delete(id: number): Promise<{ ok: boolean }>
        issueMonthlySalaries(monthYear: string): Promise<{ ok: boolean; issued: number }>
      }
      dashboard: {
        summary(startDate: string, endDate: string): Promise<DashboardSummary>
      }
    }
  }
}
