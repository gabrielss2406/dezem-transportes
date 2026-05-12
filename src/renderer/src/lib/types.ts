export interface Customer {
  id: number
  name: string
  cnpj?: string
  ie?: string
  phone?: string
  address?: string
}

export interface Product {
  id: number
  name: string
  unit: string
}

export interface Supplier {
  id: number
  name: string
  type: 'gas_station' | 'workshop' | 'quarry' | 'other'
  phone?: string
}

export interface Truck {
  id: number
  license_plate: string
  model: string
  year?: number
  capacity_ton?: number
  current_odometer: number
}

export interface Driver {
  id: number
  name: string
  cpf?: string
  phone?: string
  monthly_salary: number
  truck_id?: number
  truck_license_plate?: string
  active: number
}

export interface Route {
  id: number
  name: string
  distance_km?: number
  customer_id?: number
  customer_name?: string
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
  route_id?: number
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
  route_name?: string
}

export interface Cost {
  id: number
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
  perTruck: Array<{ license_plate: string; model: string; revenue: number; km: number }>
  perProduct: Array<{ name: string; tonnage: number; trips: number }>
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
        create(data: Omit<Customer, 'id'>): Promise<{ id: number }>
        update(id: number, data: Partial<Customer>): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      products: {
        list(search?: string): Promise<Product[]>
        create(data: Omit<Product, 'id'>): Promise<{ id: number }>
        update(id: number, data: Partial<Product>): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      suppliers: {
        list(search?: string): Promise<Supplier[]>
        create(data: Omit<Supplier, 'id'>): Promise<{ id: number }>
        update(id: number, data: Partial<Supplier>): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      trucks: {
        list(): Promise<Truck[]>
        create(data: Omit<Truck, 'id'>): Promise<{ id: number }>
        update(id: number, data: Partial<Truck>): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      drivers: {
        list(): Promise<Driver[]>
        create(data: Omit<Driver, 'id'>): Promise<{ id: number }>
        update(id: number, data: Partial<Driver>): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      routes: {
        list(): Promise<Route[]>
        create(data: Omit<Route, 'id'>): Promise<{ id: number }>
      }
      trips: {
        list(filters?: any): Promise<Trip[]>
        create(data: Omit<Trip, 'id'>): Promise<{ id: number }>
        delete(id: number): Promise<{ ok: boolean }>
        getFuelStops(tripId: number): Promise<FuelStop[]>
      }
      costs: {
        list(filters?: any): Promise<Cost[]>
        create(data: Omit<Cost, 'id'>): Promise<{ id: number }>
        delete(id: number): Promise<{ ok: boolean }>
        issueMonthlySalaries(monthYear: string): Promise<{ ok: boolean; issued: number }>
      }
      dashboard: {
        summary(startDate: string, endDate: string): Promise<DashboardSummary>
      }
    }
  }
}
