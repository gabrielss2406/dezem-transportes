import assert from 'node:assert/strict'
import { allocateOilCredit } from '../src/shared/oilCredits'
import { getOilCreditDashboardSummary } from '../src/shared/oilCreditsDashboard'

const dashboardSummary = getOilCreditDashboardSummary({
  activeAmount: 1250,
  activeLots: 2,
  expiredAmount: 300,
  expiredLots: 1,
})
assert.equal(dashboardSummary.activeAmount, 1250)
assert.equal(dashboardSummary.activeLots, 2)
assert.equal(dashboardSummary.expiredAmount, 300)
assert.equal(dashboardSummary.expiredLots, 1)
const emptyDashboardSummary = getOilCreditDashboardSummary(undefined)
assert.equal(emptyDashboardSummary.activeAmount, 0)
assert.equal(emptyDashboardSummary.expiredLots, 0)

const result = allocateOilCredit(
  [
    { id: 1, available: 40, expiresAt: '2026-10-10' },
    { id: 2, available: 80, expiresAt: '2026-10-20' },
  ],
  100,
  '2026-10-01',
)

assert.deepEqual(result.allocations, [
  { entryId: 1, amount: 40 },
  { entryId: 2, amount: 60 },
])
assert.equal(result.creditAmount, 100)
assert.equal(result.paidAmount, 0)

const expired = allocateOilCredit(
  [{ id: 1, available: 25, expiresAt: '2026-09-30' }],
  100,
  '2026-10-01',
  true,
)
assert.equal(expired.creditAmount, 25)
assert.equal(expired.paidAmount, 75)

const activeBeforeExpired = allocateOilCredit(
  [
    { id: 1, available: 25, expiresAt: '2026-10-10' },
    { id: 2, available: 25, expiresAt: '2026-09-30' },
  ],
  10,
  '2026-10-01',
)
assert.deepEqual(activeBeforeExpired.allocations, [{ entryId: 1, amount: 10 }])
assert.equal(activeBeforeExpired.paidAmount, 0)

const expiredWithoutAuthorization = allocateOilCredit(
  [{ id: 1, available: 25, expiresAt: '2026-09-30' }],
  100,
  '2026-10-01',
  false,
)
assert.equal(expiredWithoutAuthorization.creditAmount, 0)
assert.equal(expiredWithoutAuthorization.paidAmount, 100)

console.log('oil credit tests passed')
