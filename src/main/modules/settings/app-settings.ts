import { getDb } from '../../database'

const APP_SETTINGS_KEY = 'app_settings'

export interface AppSettings {
  taxRate: number
  commissionRate: number
}

const DEFAULTS: AppSettings = {
  taxRate: 0,
  commissionRate: 0,
}

export function getAppSettings(): AppSettings {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(APP_SETTINGS_KEY) as
    | { value: string }
    | undefined

  if (row) {
    try {
      return { ...DEFAULTS, ...JSON.parse(row.value) }
    } catch {
      return DEFAULTS
    }
  }

  return DEFAULTS
}

export function saveAppSettings(settings: AppSettings): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(APP_SETTINGS_KEY, JSON.stringify(settings))
}
