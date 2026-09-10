export interface AppSettings {
  taxRate: number
  commissionRate: number
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
