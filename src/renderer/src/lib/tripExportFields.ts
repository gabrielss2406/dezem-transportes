import type { Trip } from './types'
import { formatBRL, formatDate } from './utils'

export interface TripExportFilters {
  customer_id?: string
}

export interface TripExportField {
  key: string
  label: string
  getValue: (trip: Trip) => string
  getTotal?: (trips: Trip[]) => string
  defaultSelected: (filters: TripExportFilters) => boolean
}

export const TRIP_EXPORT_FIELDS: TripExportField[] = [
  {
    key: 'date',
    label: 'Data',
    getValue: (trip) => formatDate(trip.date),
    defaultSelected: () => true,
  },
  {
    key: 'ticket_number',
    label: 'Bilhete',
    getValue: (trip) => trip.ticket_number || '—',
    defaultSelected: () => true,
  },
  {
    key: 'truck',
    label: 'Caminhão',
    getValue: (trip) => trip.truck_license_plate ?? '—',
    defaultSelected: () => true,
  },
  {
    key: 'driver',
    label: 'Motorista',
    getValue: (trip) => trip.driver_name ?? '—',
    defaultSelected: () => true,
  },
  {
    key: 'product',
    label: 'Produto',
    getValue: (trip) => trip.product_name ?? '—',
    defaultSelected: () => true,
  },
  {
    key: 'weight',
    label: 'Peso',
    getValue: (trip) =>
      trip.overweight_ton
        ? `${trip.weight_ton} + ${trip.overweight_ton} ton (excesso)`
        : `${trip.weight_ton} ton`,
    getTotal: (trips) => {
      const total = trips.reduce(
        (sum, trip) => sum + trip.weight_ton + (trip.overweight_ton || 0),
        0,
      )
      return `${Number(total.toFixed(4))} ton`
    },
    defaultSelected: () => true,
  },
  {
    key: 'value',
    label: 'Valor',
    getValue: (trip) => formatBRL(trip.price_charged),
    getTotal: (trips) => formatBRL(trips.reduce((sum, trip) => sum + trip.price_charged, 0)),
    defaultSelected: () => true,
  },
  {
    key: 'tax',
    label: 'Imposto',
    getValue: (trip) => (trip.tax_value ? formatBRL(trip.tax_value) : '—'),
    getTotal: (trips) => formatBRL(trips.reduce((sum, trip) => sum + (trip.tax_value || 0), 0)),
    defaultSelected: (filters) => !filters.customer_id,
  },
  {
    key: 'commission',
    label: 'Comissão',
    getValue: (trip) => (trip.commission_value ? formatBRL(trip.commission_value) : '—'),
    getTotal: (trips) =>
      formatBRL(trips.reduce((sum, trip) => sum + (trip.commission_value || 0), 0)),
    defaultSelected: (filters) => !filters.customer_id,
  },
  {
    key: 'customer',
    label: 'Cliente',
    getValue: (trip) => trip.customer_name ?? '—',
    defaultSelected: () => true,
  },
  {
    key: 'third_party',
    label: 'Terceiro',
    getValue: (trip) => (trip.is_third_party ? (trip.third_party_contractor_name ?? 'Sim') : 'Não'),
    defaultSelected: (filters) => !filters.customer_id,
  },
]

export function getDefaultTripExportFieldKeys(filters: TripExportFilters): string[] {
  return TRIP_EXPORT_FIELDS.filter((field) => field.defaultSelected(filters)).map(
    (field) => field.key,
  )
}
