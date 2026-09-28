export interface OilCreditDashboardInput {
  activeAmount?: number
  activeLots?: number
  expiredAmount?: number
  expiredLots?: number
}

export interface OilCreditDashboardSummary {
  activeAmount: number
  activeLots: number
  expiredAmount: number
  expiredLots: number
}

export function getOilCreditDashboardSummary(
  credits?: OilCreditDashboardInput,
): OilCreditDashboardSummary {
  return {
    activeAmount: credits?.activeAmount ?? 0,
    activeLots: credits?.activeLots ?? 0,
    expiredAmount: credits?.expiredAmount ?? 0,
    expiredLots: credits?.expiredLots ?? 0,
  }
}
