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
  unit_value?: number | null
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

export interface Contractor {
  id: number
  name: string
  cnpj?: string
  phone?: string
}

export interface Truck {
  id: number
  customId?: number
  license_plate: string
  model?: string
  year?: number
  capacity_ton?: number
  current_odometer: number
  is_outsourced?: number
  contractor_id?: number
  contractor_name?: string
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
  is_outsourced?: number
  contractor_id?: number
  contractor_name?: string
  commission_rate_override?: number | null
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

export interface FuelRecord {
  id: number
  truck_id: number
  date: string
  liters?: number | null
  value: number
  odometer_at_service: number
  supplier_id?: number | null
  notes?: string | null
  created_at?: string
  truck_license_plate?: string
  truck_model?: string
  supplier_name?: string
}

export interface Trip {
  id: number
  ticket_number: string
  date: string
  truck_id: number
  driver_id: number
  product_id: number
  customer_id?: number
  supplier_id?: number
  weight_ton: number
  overweight_ton?: number | null
  overweight_observation?: string | null
  price_charged: number
  km_driven: number
  observation?: string
  has_percentage_tax?: boolean
  tax_value?: number
  has_commission?: boolean
  commission_value?: number
  fuel_stops?: FuelStop[]
  fuel_stops_count?: number
  // joins
  truck_license_plate?: string
  truck_model?: string
  driver_name?: string
  driver_is_outsourced?: number
  product_name?: string
  customer_name?: string
}

export interface MaintenanceType {
  id: number
  name: string
  description?: string
  interval_km: number
  is_active: number
  is_deletable: number
}

export interface MaintenanceRecord {
  id: number
  truck_id: number
  maintenance_type_id: number
  date: string
  odometer_at_service: number
  notes?: string
  created_at?: string
  // joins
  truck_license_plate?: string
  truck_model?: string
  type_name?: string
  interval_km?: number
}

export interface TruckMaintenanceTypeStatus {
  type_id: number
  type_name: string
  interval_km: number
  last_record_id: number | null
  last_date: string | null
  odometer_at_service: number | null
  km_since_last: number | null
  km_remaining: number | null
  status: 'ok' | 'due_soon' | 'overdue' | 'never'
}

export interface TruckMaintenanceStatus {
  truck_id: number
  truck_license_plate: string
  truck_model: string
  current_odometer: number
  types: TruckMaintenanceTypeStatus[]
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
  installment_group_id?: string | null
  installment_number?: number | null
  installment_total?: number | null
  kind: 'operational' | 'expense'
  status: 'open' | 'paid'
  paid_date?: string | null
  // joins
  truck_license_plate?: string
  supplier_name?: string
  driver_name?: string
}

export interface DashboardSummary {
  revenue: number
  netRevenue: number
  tax: number
  cost: number
  profit: number
  netProfit: number
  expenseCost: number
  expenseOpenCount: number
  expenseOpenValue: number
  totalTrips: number
  totalKm: number
  fuelCost: number
  fuelLiters: number
  perTruck: Array<{
    license_plate: string
    model: string
    revenue: number
    km: number
    cost: number
    fuelCost: number
    profit: number
    cpk: number | null
    trip_count: number
    startOdometer: number | null
    endOdometer: number | null
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
    cost: number
    expense: number
    net: number
  }>
  maintenanceSummary: {
    overdueCount: number
    dueSoonCount: number
    neverCount: number
    okCount: number
    alerts: Array<{
      truck_id: number
      truck_license_plate: string
      truck_model: string
      type_name: string
      km_since_last: number
      km_remaining: number
      status: 'overdue' | 'due_soon'
    }>
  }
  perCategory: Array<{ category: string; total: number }>
  perCustomer: Array<{
    customer_name: string
    revenue: number
    netRevenue: number
    tonnage: number
    trips: number
  }>
  perProduct: Array<{
    product_name: string
    revenue: number
    tonnage: number
    trips: number
  }>
  bankBalance: number
  receivablesOpenTotal: number
  costsOpenTotal: number
}

export interface CommissionByDriver {
  id: number
  name: string
  total_commission: number
  trip_count: number
}

export interface Receivable {
  id: number
  trip_id?: number | null
  customer_id?: number | null
  amount: number
  status: 'open' | 'paid'
  due_date?: string | null
  paid_date?: string | null
  description?: string | null
  created_at?: string
  // joins
  trip_ticket_number?: string
  trip_date?: string
  customer_name?: string
}

export interface ReceivableCustomerSummary {
  customer_id: number | null
  customer_name: string | null
  open_amount: number
  open_count: number
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
      contractors: {
        list(filters?: any): Promise<Contractor[]>
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
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
        create(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        update(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean; errors?: any }>
        getFuelStops(tripId: number): Promise<FuelStop[]>
      }
      fuel: {
        list(filters?: any): Promise<FuelRecord[]>
        create(data: any): Promise<{ id?: number; ok?: boolean; errors?: any }>
        delete(id: number): Promise<{ ok: boolean }>
      }
      maintenance: {
        listTypes(includeInactive?: boolean): Promise<MaintenanceType[]>
        createType(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        updateType(id: number, data: any): Promise<{ ok: boolean; errors?: any }>
        deleteType(id: number): Promise<{ ok: boolean; error?: string }>
        listRecords(filters?: any): Promise<MaintenanceRecord[]>
        createRecord(data: any): Promise<{ id: number; ok?: boolean; errors?: any }>
        deleteRecord(id: number): Promise<{ ok: boolean }>
        getStatus(filters?: any): Promise<TruckMaintenanceStatus[]>
      }
      costs: {
        list(filters?: any): Promise<Cost[]>
        create(data: any): Promise<{ id: number }>
        update(id: number, data: any): Promise<{ ok: boolean }>
        delete(id: number): Promise<{ ok: boolean }>
        markPaid(data: { ids: number[]; paid_date: string }): Promise<{
          ok: boolean
          updated?: number
        }>
        issueMonthlySalaries(monthYear: string): Promise<{ ok: boolean; issued: number }>
      }
      dashboard: {
        summary(startDate: string, endDate: string): Promise<DashboardSummary>
        commissionByDriver(
          startDate: string,
          endDate: string,
          driverId?: number | string,
        ): Promise<CommissionByDriver[]>
      }
      receivables: {
        list(filters?: any): Promise<Receivable[]>
        markPaid(data: { ids: number[]; paid_date: string }): Promise<{
          ok: boolean
          updated?: number
        }>
        create(data: any): Promise<{
          ok: boolean
          id?: number
          errors?: Record<string, string>
        }>
        delete(id: number): Promise<{
          ok: boolean
          errors?: Record<string, string>
        }>
        summaryByCustomer(): Promise<ReceivableCustomerSummary[]>
      }
      backup: {
        getConfig(): Promise<import('../../../shared/types').BackupConfig | null>
        saveConfig(config: import('../../../shared/types').BackupConfig): Promise<void>
        clearConfig(): Promise<void>
        performBackup(): Promise<{ ok: boolean; error?: string }>
        getStatus(): Promise<import('../../../shared/types').BackupStatus | null>
        isEnvConfigured(): Promise<{ isEnv: boolean; isDb: boolean }>
        list(): Promise<Array<{ key: string; size: number; lastModified: string }>>
        analyze(key: string): Promise<{
          timestamp: string
          tables: Array<{ name: string; count: number; columns: string[] }>
          stats: {
            trips: number
            costs: number
            drivers: number
            trucks: number
            customers: number
            products: number
            suppliers: number
          }
          warnings: string[]
          size_mb: number
        }>
        restore(key: string): Promise<{ ok: boolean }>
        onStatusUpdate(
          callback: (status: import('../../../shared/types').BackupStatus) => void,
        ): () => void
      }
      settings: {
        getApp(): Promise<import('../../../shared/types').AppSettings>
        saveApp(data: import('../../../shared/types').AppSettings): Promise<{ ok: boolean }>
        getTripExportFields(): Promise<import('../../../shared/types').TripExportFieldsConfig>
        saveTripExportFields(fields: string[]): Promise<{ ok: boolean }>
      }
      exportPdf(data: import('../../../shared/types').PdfExportData): Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      exportImage(data: import('../../../shared/types').ImageExportData): Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      onDataChanged(callback: (entity: string) => void): () => void
    }
  }
}
