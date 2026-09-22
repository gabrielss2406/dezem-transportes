export function calculateSalaryRemaining(monthlySalary: number, issuedSalary: number): number {
  return Math.max(Number(monthlySalary || 0) - Number(issuedSalary || 0), 0)
}

export function getInitialSalaryLaunchDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextSalaryDriverId(
  driverIds: number[],
  currentDriverId: number,
  direction: 1 | -1,
): number | null {
  const currentIndex = driverIds.indexOf(currentDriverId)
  const nextIndex = currentIndex + direction
  return nextIndex >= 0 && nextIndex < driverIds.length ? driverIds[nextIndex] : null
}
