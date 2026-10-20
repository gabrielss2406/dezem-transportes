export function calculateFuelEfficiencyKmPerLiter(
  distanceKm: number,
  fuelLiters: number,
): number | null {
  return distanceKm > 0 && fuelLiters > 0 ? distanceKm / fuelLiters : null
}

// Distance covered in a period. The baseline is the last odometer reading before the period
// (so the gap between the previous month's last fill and this month's first fill is counted,
// matching the liters of that first fill); falls back to the first reading in the period.
export function calculatePeriodDistanceKm({
  startOdo,
  endOdo,
  prevOdo,
}: {
  startOdo: number | null
  endOdo: number | null
  prevOdo: number | null
}): number {
  const baseline = prevOdo ?? startOdo
  if (endOdo == null || baseline == null) {
    return 0
  }
  return Math.max(0, endOdo - baseline)
}
