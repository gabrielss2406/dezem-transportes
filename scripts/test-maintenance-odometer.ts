import assert from 'node:assert/strict'
import { type OdometerReading, getOdometerWarning } from '../src/shared/maintenanceOdometer'

const r18: OdometerReading = { date: '2026-11-18', odometer: 9800, source: 'fuel' }
const r21: OdometerReading = { date: '2026-11-21', odometer: 10500, source: 'fuel' }
const readings = [r18, r21]

// CA-03: km between previous and next -> no warning
assert.equal(getOdometerWarning(readings, '2026-11-20', 10000), null)

// CA-02: km below previous reading
assert.deepEqual(getOdometerWarning(readings, '2026-11-20', 9000), {
  kind: 'below_previous',
  reference: r18,
})

// km above next reading
assert.deepEqual(getOdometerWarning(readings, '2026-11-20', 11000), {
  kind: 'above_next',
  reference: r21,
})

// equal km on the same date as the reading -> no warning
assert.equal(getOdometerWarning(readings, '2026-11-18', 9800), null)

// no previous reading: only compared with next
assert.equal(getOdometerWarning(readings, '2026-11-10', 5000), null)
assert.deepEqual(getOdometerWarning(readings, '2026-11-10', 9900), {
  kind: 'above_next',
  reference: r18,
})

// no readings at all
assert.equal(getOdometerWarning([], '2026-11-20', 123), null)

// unsorted input gives the same result
assert.deepEqual(getOdometerWarning([r21, r18], '2026-11-20', 9000), {
  kind: 'below_previous',
  reference: r18,
})

// Same-day readings have no time of day, so they never count as previous/next:
// a morning service at 9.900 and an evening fuel stop at 10.000 must not warn each other.
const sameDayService: OdometerReading = {
  date: '2026-11-20',
  odometer: 9900,
  source: 'maintenance',
}
const sameDayFuel: OdometerReading = { date: '2026-11-20', odometer: 10000, source: 'fuel' }
const withSameDay = [r18, r21, sameDayService, sameDayFuel]

assert.equal(getOdometerWarning(withSameDay, '2026-11-20', 9900), null)
assert.equal(getOdometerWarning(withSameDay, '2026-11-20', 10000), null)
assert.deepEqual(getOdometerWarning(withSameDay, '2026-11-20', 9000), {
  kind: 'below_previous',
  reference: r18,
})
assert.deepEqual(getOdometerWarning(withSameDay, '2026-11-20', 12000), {
  kind: 'above_next',
  reference: r21,
})

console.log('maintenance odometer tests passed')
