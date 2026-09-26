import assert from 'node:assert/strict'
import { calculateFuelEfficiencyKmPerLiter } from '../src/shared/fuel'
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

console.log('salary summary tests passed')
