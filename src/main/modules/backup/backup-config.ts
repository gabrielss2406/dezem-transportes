import type { BackupConfig, BackupStatus } from '../../../shared/types'
import { getDb } from '../../database'

const CONFIG_KEY = 'backup_config'
const STATUS_KEY = 'backup_status'
export function getBackupConfig(): BackupConfig | null {
  // 1. Tentar ler do banco de dados primeiro (Sobrescrita do Usuário)
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(CONFIG_KEY) as
    | { value: string }
    | undefined
  if (row) {
    try {
      const config = JSON.parse(row.value)
      if (config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey) {
        return config
      }
    } catch {}
  }

  // 2. Fallback para as variáveis de ambiente (baked no bundle pelo electron-vite no build)
  const endpoint = import.meta.env.MAIN_VITE_R2_ENDPOINT as string | undefined
  const bucket = import.meta.env.MAIN_VITE_R2_BUCKET as string | undefined
  const accessKeyId = import.meta.env.MAIN_VITE_R2_ACCESS_KEY_ID as string | undefined
  const secretAccessKey = import.meta.env.MAIN_VITE_R2_SECRET_ACCESS_KEY as string | undefined

  if (endpoint && bucket && accessKeyId && secretAccessKey) {
    return { endpoint, bucket, accessKeyId, secretAccessKey }
  }

  return null
}

export function saveBackupConfig(config: BackupConfig): void {
  const db = getDb()
  const value = JSON.stringify(config)
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(CONFIG_KEY, value)
}

export function clearBackupConfig(): void {
  const db = getDb()
  db.prepare('DELETE FROM settings WHERE key = ?').run(CONFIG_KEY)
}

export function getBackupStatus(): BackupStatus | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(STATUS_KEY) as
    | { value: string }
    | undefined
  if (!row) {
    return null
  }
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

export function saveBackupStatus(status: BackupStatus): void {
  const db = getDb()
  const value = JSON.stringify(status)
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(STATUS_KEY, value)
}
