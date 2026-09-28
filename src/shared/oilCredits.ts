export interface OilCreditLot {
  id: number
  available: number
  expiresAt: string
}

export interface OilCreditAllocation {
  entryId: number
  amount: number
}

export interface OilCreditAllocationResult {
  allocations: OilCreditAllocation[]
  creditAmount: number
  paidAmount: number
}

/**
 * Allocates an avulso fuel purchase against the customer's credit lots.
 * Lots are expected to be ordered by expiry, then id. Expired lots are only
 * considered when explicitly allowed by the user.
 */
export function allocateOilCredit(
  lots: OilCreditLot[],
  grossAmount: number,
  usageDate: string,
  allowExpired = false,
): OilCreditAllocationResult {
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new Error('O valor do abastecimento deve ser positivo.')
  }

  let remaining = grossAmount
  const allocations: OilCreditAllocation[] = []
  for (const lot of lots) {
    if (remaining <= 0) {
      break
    }
    if (lot.available <= 0) {
      continue
    }
    if (lot.expiresAt < usageDate && !allowExpired) {
      continue
    }

    const amount = Math.min(remaining, lot.available)
    allocations.push({ entryId: lot.id, amount })
    remaining -= amount
  }

  const creditAmount = grossAmount - remaining
  return {
    allocations,
    creditAmount,
    paidAmount: remaining,
  }
}
