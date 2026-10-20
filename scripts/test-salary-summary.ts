import assert from 'node:assert/strict'
import { calculateFuelEfficiencyKmPerLiter, calculatePeriodDistanceKm } from '../src/shared/fuel'
import {
  calculateSalaryRemaining,
  getInitialSalaryLaunchDate,
  getNextSalaryDriverId,
} from '../src/shared/salary'

assert.equal(calculateSalaryRemaining(2500, 0), 2500)
assert.equal(calculateSalaryRemaining(2500, 700), 1800)
assert.equal(calculateSalaryRemaining(2500, 3000), 0)
assert.equal(calculateSalaryRemaining(0, 0), 0)
assert.equal(getInitialSalaryLaunchDate(new Date(2026, 8, 22)), '2026-09-22')
assert.equal(getNextSalaryDriverId([10, 20, 30], 20, 1), 30)
assert.equal(getNextSalaryDriverId([10, 20, 30], 20, -1), 10)
assert.equal(getNextSalaryDriverId([10, 20, 30], 30, 1), null)
assert.equal(calculateFuelEfficiencyKmPerLiter(450, 50), 9)
assert.equal(calculateFuelEfficiencyKmPerLiter(450, 0), null)
assert.equal(
  calculatePeriodDistanceKm({ startOdo: 769227, endOdo: 780000, prevOdo: 768777 }),
  780000 - 768777,
)
assert.equal(
  calculatePeriodDistanceKm({ startOdo: 769227, endOdo: 780000, prevOdo: null }),
  780000 - 769227,
)
assert.equal(calculatePeriodDistanceKm({ startOdo: 769227, endOdo: 769227, prevOdo: 768777 }), 450)
assert.equal(calculatePeriodDistanceKm({ startOdo: 100, endOdo: 90, prevOdo: 95 }), 0)
assert.equal(calculatePeriodDistanceKm({ startOdo: null, endOdo: null, prevOdo: 100 }), 0)

console.log('salary summary tests passed')
