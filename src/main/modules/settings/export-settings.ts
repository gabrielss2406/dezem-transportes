import { getDb } from '../../database'

const TRIP_EXPORT_FIELDS_KEY = 'trip_export_fields'

export function getTripExportFieldsConfig(): string[] | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(TRIP_EXPORT_FIELDS_KEY) as
    | { value: string }
    | undefined

  if (!row) {
    return null
  }

  try {
    const parsed = JSON.parse(row.value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveTripExportFieldsConfig(fields: string[]): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(TRIP_EXPORT_FIELDS_KEY, JSON.stringify(fields))
}
