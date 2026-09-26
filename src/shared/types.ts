export interface AppSettings {
  taxRate: number
  commissionRate: number
}

// A manually entered monthly snapshot of the bank balance. month is a 'YYYY-MM' key and
// the primary key: there is at most one record per month, and months with no record are
// simply absent (never zero-filled, never inferred from another month).
export interface BankBalanceRecord {
  month: string
  balance: number
  created_at: string
  updated_at: string
}

export interface BackupConfig {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export interface BackupStatus {
  ok: boolean
  timestamp?: string
  error?: string
}

export interface PdfExportData {
  fileName: string
  data: ArrayBuffer
}

export interface ImageExportData {
  fileName: string
  data: ArrayBuffer
}

export type TripExportFieldsConfig = string[] | null

// ── Maintenance status (computed in maintenance.handlers, consumed by the
// Maintenance page and the Dashboard) ────────────────────────────────────────

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
