export function calculateFuelEfficiencyKmPerLiter(
  distanceKm: number,
  fuelLiters: number,
): number | null {
  return distanceKm > 0 && fuelLiters > 0 ? distanceKm / fuelLiters : null
}
