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
