export type OdometerReading = {
  /** YYYY-MM-DD */
  date: string
  odometer: number
  source: 'fuel' | 'maintenance'
}

export type OdometerWarning = {
  kind: 'below_previous' | 'above_next'
  reference: OdometerReading
}

/**
 * Compares a maintenance odometer with the truck's readings around the service date.
 * Never blocks: it only reports the reading the value disagrees with, if any.
 *
 * Previous = latest reading on or before `date` (ties: highest km).
 * Next = earliest reading after `date` (ties: lowest km).
 */
export function getOdometerWarning(
  readings: OdometerReading[],
  date: string,
  odometer: number,
): OdometerWarning | null {
  let previous: OdometerReading | null = null
  let next: OdometerReading | null = null

  for (const reading of readings) {
    if (reading.date <= date) {
      if (
        !previous ||
        reading.date > previous.date ||
        (reading.date === previous.date && reading.odometer > previous.odometer)
      ) {
        previous = reading
      }
    } else if (
      !next ||
      reading.date < next.date ||
      (reading.date === next.date && reading.odometer < next.odometer)
    ) {
      next = reading
    }
  }

  if (previous && odometer < previous.odometer) {
    return { kind: 'below_previous', reference: previous }
  }
  if (next && odometer > next.odometer) {
    return { kind: 'above_next', reference: next }
  }
  return null
}
